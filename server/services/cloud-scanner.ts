import { Storage } from '@google-cloud/storage';
import { DlpServiceClient } from '@google-cloud/dlp';
import { SecurityCenterClient } from '@google-cloud/security-center';
import { CronJob } from 'cron';
import { tokenizationService } from '../tokenization';
import { storage } from '../storage';

interface ScannerConfig {
  projectId: string;
  scanInterval: string;
  bucketPatterns: string[];
  customDataPatterns: RegExp[];
  encryptionOptions: {
    algorithm: string;
    keyRotationInterval: number;
  };
}

export class CloudScanner {
  private static instance: CloudScanner;
  private storage: Storage;
  private dlp: DlpServiceClient;
  private securityCenter: SecurityCenterClient;
  private scanJob: CronJob;
  private config: ScannerConfig;

  private constructor(config: ScannerConfig) {
    this.config = config;
    this.storage = new Storage();
    this.dlp = new DlpServiceClient();
    this.securityCenter = new SecurityCenterClient();

    this.scanJob = new CronJob(
      config.scanInterval,
      () => this.performScan(),
      null,
      false,
      'UTC'
    );
  }

  static getInstance(config: ScannerConfig): CloudScanner {
    if (!CloudScanner.instance) {
      CloudScanner.instance = new CloudScanner(config);
    }
    return CloudScanner.instance;
  }

  async start(): Promise<void> {
    if (!this.scanJob.running) {
      this.scanJob.start();
      await storage.createAuditLog({
        userId: 0,
        action: 'start_cloud_scanner',
        details: JSON.stringify({
          scanInterval: this.config.scanInterval,
          bucketPatterns: this.config.bucketPatterns,
        }),
        timestamp: new Date(),
      });
    }
  }

  async stop(): Promise<void> {
    if (this.scanJob.running) {
      this.scanJob.stop();
      await storage.createAuditLog({
        userId: 0,
        action: 'stop_cloud_scanner',
        details: JSON.stringify({
          scanInterval: this.config.scanInterval,
        }),
        timestamp: new Date(),
      });
    }
  }

  private async performScan(): Promise<void> {
    try {
      await storage.createAuditLog({
        userId: 0,
        action: 'cloud_scan_started',
        details: JSON.stringify({
          timestamp: new Date().toISOString(),
        }),
        timestamp: new Date(),
      });

      const [buckets] = await this.storage.getBuckets();
      const matchingBuckets = buckets.filter(bucket =>
        this.config.bucketPatterns.some(pattern =>
          bucket.name.match(new RegExp(pattern))
        )
      );

      for (const bucket of matchingBuckets) {
        const [files] = await bucket.getFiles();

        for (const file of files) {
          const [dlpResponse] = await this.dlp.inspectContent({
            parent: `projects/${this.config.projectId}/locations/global`,
            inspectConfig: {
              infoTypes: [
                { name: 'PERSON_NAME' },
                { name: 'EMAIL_ADDRESS' },
                { name: 'PHONE_NUMBER' },
                { name: 'CREDIT_CARD_NUMBER' },
                { name: 'US_SOCIAL_SECURITY_NUMBER' }
              ],
              includeQuote: true,
            },
            item: {
              byteItem: {
                type: 'TEXT_UTF8',
                data: (await file.download())[0],
              },
            },
          });

          const findings = dlpResponse.result?.findings || [];
          if (findings.length > 0) {
            for (const finding of findings) {
              if (finding.quote) {
                const token = await tokenizationService.tokenize(
                  { value: finding.quote },
                  0,
                  24
                );

                await storage.createAuditLog({
                  userId: 0,
                  action: 'cloud_scan_tokenize',
                  details: JSON.stringify({
                    bucket: bucket.name,
                    file: file.name,
                    infoType: finding.infoType?.name,
                    token,
                  }),
                  timestamp: new Date(),
                });
              }
            }

            await this.securityCenter.createFinding({
              parent: `projects/${this.config.projectId}/locations/global`,
              findingId: `scan_${Date.now()}`,
              finding: {
                state: 'ACTIVE',
                category: 'SENSITIVE_DATA_EXPOSURE',
                sourceProperties: {
                  bucketName: bucket.name,
                  fileName: file.name,
                  findingsCount: findings.length,
                },
                eventTime: {
                  seconds: Math.floor(Date.now() / 1000),
                  nanos: 0
                },
                severity: 'HIGH',
              },
            });
          }
        }
      }

      await storage.createAuditLog({
        userId: 0,
        action: 'cloud_scan_completed',
        details: JSON.stringify({
          scannedBuckets: matchingBuckets.length,
          timestamp: new Date().toISOString(),
        }),
        timestamp: new Date(),
      });
    } catch (error) {
      await storage.createAuditLog({
        userId: 0,
        action: 'cloud_scan_error',
        details: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
        timestamp: new Date(),
      });
    }
  }

  async updateConfig(newConfig: Partial<ScannerConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.scanInterval && newConfig.scanInterval !== this.scanJob.cronTime.source) {
      const newJob = new CronJob(
        newConfig.scanInterval,
        () => this.performScan(),
        null,
        false,
        'UTC'
      );
      this.scanJob.stop();
      this.scanJob = newJob;
      this.scanJob.start();
    }

    await storage.createAuditLog({
      userId: 0,
      action: 'update_scanner_config',
      details: JSON.stringify(newConfig),
      timestamp: new Date(),
    });
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    lastScanTime?: Date;
    totalScans: number;
    totalFindings: number;
    config: ScannerConfig;
  }> {
    const auditLogs = await storage.getAuditLogs(0);
    const scanLogs = auditLogs.filter(log => 
      ['cloud_scan_started', 'cloud_scan_completed', 'cloud_scan_error'].includes(log.action)
    );

    const lastScanLog = scanLogs[scanLogs.length - 1];
    const totalScans = scanLogs.filter(log => log.action === 'cloud_scan_completed').length;
    const totalFindings = auditLogs.filter(log => log.action === 'cloud_scan_tokenize').length;

    return {
      isRunning: this.scanJob.running,
      lastScanTime: lastScanLog?.timestamp,
      totalScans,
      totalFindings,
      config: this.config,
    };
  }
}

const defaultConfig: ScannerConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
  scanInterval: '0 */6 * * *',
  bucketPatterns: ['.*'],
  customDataPatterns: [],
  encryptionOptions: {
    algorithm: 'AES-256-GCM',
    keyRotationInterval: 24,
  },
};

export const cloudScanner = CloudScanner.getInstance(defaultConfig);