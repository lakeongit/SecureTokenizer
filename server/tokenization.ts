import crypto from "crypto";
import { Token } from "@shared/schema";
import { storage } from "./storage";

const KEY_SIZE = 32;
const TOKEN_SIZE = 32;

export class TokenizationService {
  private static instance: TokenizationService;
  private currentKey: Buffer;
  private keyRotationInterval: NodeJS.Timer;

  private constructor() {
    this.currentKey = this.generateKey();
    this.keyRotationInterval = setInterval(() => {
      this.rotateKey();
    }, 24 * 60 * 60 * 1000); // Rotate key every 24 hours
  }

  static getInstance(): TokenizationService {
    if (!TokenizationService.instance) {
      TokenizationService.instance = new TokenizationService();
    }
    return TokenizationService.instance;
  }

  private generateKey(): Buffer {
    return crypto.randomBytes(KEY_SIZE);
  }

  private rotateKey(): void {
    this.currentKey = this.generateKey();
  }

  async tokenize(data: Record<string, string>, userId: number, expiryHours?: number): Promise<string> {
    const token = crypto.randomBytes(TOKEN_SIZE).toString('hex');
    const encryptedData = this.encrypt(JSON.stringify(data));

    const expires = new Date(Date.now() + (expiryHours || 24) * 60 * 60 * 1000);

    await storage.createToken({
      token,
      sensitiveData: encryptedData,
      userId,
      created: new Date(),
      expires,
    });

    await storage.createAuditLog({
      userId,
      action: 'tokenize',
      details: JSON.stringify({ tokenId: token }),
      timestamp: new Date(),
    });

    return token;
  }

  async detokenize(token: string, userId: number): Promise<Record<string, string> | null> {
    const tokenRecord = await storage.getToken(token);

    if (!tokenRecord) {
      throw new Error('Token not found');
    }

    if (tokenRecord.expires && tokenRecord.expires < new Date()) {
      throw new Error('Token expired');
    }

    await storage.createAuditLog({
      userId,
      action: 'detokenize',
      details: JSON.stringify({ tokenId: token }),
      timestamp: new Date(),
    });

    const decrypted = this.decrypt(tokenRecord.sensitiveData);
    return JSON.parse(decrypted);
  }

  private encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.currentKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  private decrypt(data: string): string {
    const buf = Buffer.from(data, 'base64');
    const iv = buf.subarray(0, 16);
    const authTag = buf.subarray(16, 32);
    const encrypted = buf.subarray(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.currentKey, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
}

export const tokenizationService = TokenizationService.getInstance();