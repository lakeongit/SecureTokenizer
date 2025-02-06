import { storage } from '../storage';
import { cloudScanner } from './cloud-scanner';
import type { Token, AuditLog } from '@shared/schema';

interface TokenizationMetrics {
  totalTokens: number;
  activeTokens: number;
  expiredTokens: number;
  revokedTokens: number;
  averageTokenLifespan: number;
}

interface ScannerMetrics {
  totalScans: number;
  totalFindings: number;
  bucketsCovered: number;
  averageScanDuration: number;
  detectionsByType: Record<string, number>;
}

interface ComplianceMetrics {
  tokenExpiryCompliance: number;
  dataRetentionCompliance: number;
  scanningCoverage: number;
  unusedTokenPercentage: number;
}

interface PerformanceMetrics {
  averageTokenizationTime: number;
  averageDetokenizationTime: number;
  scannerLatency: number;
  apiResponseTimes: Record<string, number>;
}

export class ReportingService {
  async getTokenizationMetrics(userId: number, timeRange?: { start: Date; end: Date }): Promise<TokenizationMetrics> {
    const auditLogs = await storage.getAuditLogs(userId);
    const now = new Date();

    // Filter logs by time range if provided
    const filteredLogs = timeRange 
      ? auditLogs.filter(log => log.timestamp >= timeRange.start && log.timestamp <= timeRange.end)
      : auditLogs;

    // Calculate metrics
    const tokenizationLogs = filteredLogs.filter(log => 
      ['tokenize', 'revoke_token', 'extend_token'].includes(log.action)
    );

    const tokens = await storage.getAllTokens(userId);
    const activeTokens = tokens.filter(token => token.expires > now).length;
    const expiredTokens = tokens.filter(token => token.expires <= now).length;
    const revokedTokens = tokenizationLogs.filter(log => log.action === 'revoke_token').length;

    // Calculate average token lifespan
    const tokenLifespans = tokens.map(token => 
      token.expires.getTime() - token.created.getTime()
    );
    const averageLifespan = tokenLifespans.length > 0
      ? tokenLifespans.reduce((sum, val) => sum + val, 0) / tokenLifespans.length
      : 0;

    return {
      totalTokens: tokens.length,
      activeTokens,
      expiredTokens,
      revokedTokens,
      averageTokenLifespan: averageLifespan / (1000 * 60 * 60) // Convert to hours
    };
  }

  async getScannerMetrics(timeRange?: { start: Date; end: Date }): Promise<ScannerMetrics> {
    const scannerStatus = await cloudScanner.getStatus();
    const auditLogs = await storage.getAuditLogs(999999); // System user ID

    const filteredLogs = timeRange
      ? auditLogs.filter(log => log.timestamp >= timeRange.start && log.timestamp <= timeRange.end)
      : auditLogs;

    const scanLogs = filteredLogs.filter(log => 
      log.action === 'cloud_scan_completed'
    );

    const findingsLogs = filteredLogs.filter(log => 
      log.action === 'cloud_scan_tokenize'
    );

    // Calculate detection types
    const detectionsByType = findingsLogs.reduce((acc: Record<string, number>, log) => {
      const details = JSON.parse(log.details);
      const infoType = details.infoType || 'unknown';
      acc[infoType] = (acc[infoType] || 0) + 1;
      return acc;
    }, {});

    // Calculate average scan duration
    const scanDurations = scanLogs.map(log => {
      const details = JSON.parse(log.details);
      return details.duration || 0;
    });

    const averageDuration = scanDurations.length > 0
      ? scanDurations.reduce((sum, val) => sum + val, 0) / scanDurations.length
      : 0;

    return {
      totalScans: scannerStatus.totalScans,
      totalFindings: scannerStatus.totalFindings,
      bucketsCovered: scanLogs.length > 0 ? JSON.parse(scanLogs[0].details).scannedBuckets : 0,
      averageScanDuration: averageDuration,
      detectionsByType
    };
  }

  async getComplianceMetrics(userId: number): Promise<ComplianceMetrics> {
    const tokens = await storage.getAllTokens(userId);
    const now = new Date();

    // Calculate token expiry compliance
    const expiredUnrevokedTokens = tokens.filter(token => 
      token.expires <= now && !token.revoked
    ).length;

    const tokenExpiryCompliance = tokens.length > 0
      ? (1 - (expiredUnrevokedTokens / tokens.length)) * 100
      : 100;

    // Calculate data retention compliance
    const retentionThreshold = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days
    const oldTokens = tokens.filter(token => 
      token.created <= retentionThreshold && !token.revoked
    ).length;

    const dataRetentionCompliance = tokens.length > 0
      ? (1 - (oldTokens / tokens.length)) * 100
      : 100;

    // Calculate scanning coverage from scanner metrics
    const scannerStatus = await cloudScanner.getStatus();
    const scanningCoverage = scannerStatus.totalScans > 0 ? 100 : 0;

    // Calculate unused token percentage
    const unusedTokensCount = await Promise.all(
      tokens.map(async token => {
        const logs = await storage.getTokenAccessLogs(token.token);
        return logs.length === 0 ? 1 : 0;
      })
    ).then(results => results.reduce((sum, val) => sum + val, 0));

    const unusedTokenPercentage = tokens.length > 0
      ? (unusedTokensCount / tokens.length) * 100
      : 0;

    return {
      tokenExpiryCompliance,
      dataRetentionCompliance,
      scanningCoverage,
      unusedTokenPercentage
    };
  }

  async getPerformanceMetrics(userId: number, timeRange?: { start: Date; end: Date }): Promise<PerformanceMetrics> {
    const auditLogs = await storage.getAuditLogs(userId);

    const filteredLogs = timeRange
      ? auditLogs.filter(log => log.timestamp >= timeRange.start && log.timestamp <= timeRange.end)
      : auditLogs;

    // Calculate tokenization times
    const tokenizationTimes = filteredLogs
      .filter(log => log.action === 'tokenize')
      .map(log => {
        const details = JSON.parse(log.details);
        return details.duration || 0;
      });

    const averageTokenizationTime = tokenizationTimes.length > 0
      ? tokenizationTimes.reduce((sum, val) => sum + val, 0) / tokenizationTimes.length
      : 0;

    // Calculate detokenization times
    const detokenizationTimes = filteredLogs
      .filter(log => log.action === 'detokenize')
      .map(log => {
        const details = JSON.parse(log.details);
        return details.duration || 0;
      });

    const averageDetokenizationTime = detokenizationTimes.length > 0
      ? detokenizationTimes.reduce((sum, val) => sum + val, 0) / detokenizationTimes.length
      : 0;

    // Calculate scanner latency
    const scannerLogs = await storage.getAuditLogs(999999);
    const scanTimes = scannerLogs
      .filter(log => log.action === 'cloud_scan_completed')
      .map(log => {
        const details = JSON.parse(log.details);
        return details.duration || 0;
      });

    const scannerLatency = scanTimes.length > 0
      ? scanTimes.reduce((sum, val) => sum + val, 0) / scanTimes.length
      : 0;

    // Calculate API response times
    const apiResponseTimes: Record<string, number> = {
      tokenize: averageTokenizationTime,
      detokenize: averageDetokenizationTime,
      scan: scannerLatency
    };

    return {
      averageTokenizationTime,
      averageDetokenizationTime,
      scannerLatency,
      apiResponseTimes
    };
  }
}

export const reportingService = new ReportingService();