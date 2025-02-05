import crypto from "crypto";
import { Token } from "@shared/schema";
import { storage } from "./storage";

const MASTER_KEY_SIZE = 32;
const TOKEN_SIZE = 32;
const SALT_SIZE = 16;
const KEY_VERSION = 1; // Increment this when rotating master key

export class TokenizationService {
  private static instance: TokenizationService;
  private currentMasterKey: Buffer;
  private previousMasterKey: Buffer | null;
  private keyRotationInterval: NodeJS.Timer;

  private constructor() {
    const masterKeyHex = process.env.MASTER_KEY;
    if (!masterKeyHex) {
      throw new Error('MASTER_KEY environment variable is required');
    }
    this.currentMasterKey = Buffer.from(masterKeyHex, 'hex');
    this.previousMasterKey = null;
    this.keyRotationInterval = setInterval(() => {
      this.rotateMasterKey();
    }, 24 * 60 * 60 * 1000); // Rotate master key every 24 hours
  }

  static getInstance(): TokenizationService {
    if (!TokenizationService.instance) {
      TokenizationService.instance = new TokenizationService();
    }
    return TokenizationService.instance;
  }

  private rotateMasterKey(): void {
    this.previousMasterKey = this.currentMasterKey;
    this.currentMasterKey = crypto.randomBytes(MASTER_KEY_SIZE);
  }

  // Derive a unique key for each token using HKDF
  private deriveKey(salt: Buffer, masterKey: Buffer): Buffer {
    const hkdfBuffer = crypto.hkdfSync(
      'sha256',
      masterKey,
      salt,
      Buffer.from('TokenizationKey'),
      32
    );
    return Buffer.from(hkdfBuffer);
  }

  // Token management methods
  async extendTokenExpiry(token: string, userId: number, hours: number): Promise<void> {
    const tokenRecord = await storage.getToken(token);
    if (!tokenRecord) {
      throw new Error('Token not found');
    }

    if (tokenRecord.expires < new Date()) {
      throw new Error('Cannot extend expired token');
    }

    const newExpiry = new Date(tokenRecord.expires.getTime() + hours * 60 * 60 * 1000);
    await storage.updateTokenExpiry(token, newExpiry);

    await storage.createAuditLog({
      userId,
      action: 'extend_token',
      details: JSON.stringify({
        tokenId: token,
        extendedHours: hours,
        newExpiry: newExpiry.toISOString()
      }),
      timestamp: new Date(),
    });
  }

  async revokeToken(token: string, userId: number): Promise<void> {
    const tokenRecord = await storage.getToken(token);
    if (!tokenRecord) {
      throw new Error('Token not found');
    }

    // Set expiry to current time to immediately invalidate the token
    await storage.updateTokenExpiry(token, new Date());

    await storage.createAuditLog({
      userId,
      action: 'revoke_token',
      details: JSON.stringify({
        tokenId: token,
      }),
      timestamp: new Date(),
    });
  }

  async tokenize(data: Record<string, string>, userId: number, expiryHours: number = 24): Promise<string> {
    // Generate a random token identifier
    const token = crypto.randomBytes(TOKEN_SIZE).toString('hex');

    // Generate a unique salt for key derivation
    const salt = crypto.randomBytes(SALT_SIZE);

    // Derive a unique encryption key for this token using current master key
    const encryptionKey = this.deriveKey(salt, this.currentMasterKey);

    // Generate a random IV for encryption
    const iv = crypto.randomBytes(16);

    // Create cipher with the derived key
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);

    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final(),
    ]);

    // Get the auth tag
    const authTag = cipher.getAuthTag();

    // Combine all components needed for decryption
    const tokenData = Buffer.concat([
      Buffer.from([KEY_VERSION]), // Version byte
      salt,                       // Key derivation salt
      iv,                        // Initialization vector
      authTag,                   // Authentication tag
      encrypted                  // Encrypted data
    ]).toString('base64');

    // Calculate expiration time
    const expires = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Store the token in the database
    await storage.createToken({
      token,
      sensitiveData: tokenData,
      userId,
      created: new Date(),
      expires,
    });

    // Create audit log
    await storage.createAuditLog({
      userId,
      action: 'tokenize',
      details: JSON.stringify({ 
        tokenId: token,
        expiryHours,
        keyVersion: KEY_VERSION 
      }),
      timestamp: new Date(),
    });

    return token;
  }

  async detokenize(token: string, userId: number): Promise<Record<string, string>> {
    try {
      // Retrieve token from database
      const tokenRecord = await storage.getToken(token);

      if (!tokenRecord) {
        throw new Error('Token not found');
      }

      if (tokenRecord.expires < new Date()) {
        throw new Error(`Token has expired on ${tokenRecord.expires.toLocaleString()}. Please generate a new token or extend the expiry if needed.`);
      }

      // Decode the token data
      const tokenData = Buffer.from(tokenRecord.sensitiveData, 'base64');

      // Extract components
      const version = tokenData[0];
      const salt = tokenData.subarray(1, 1 + SALT_SIZE);
      const iv = tokenData.subarray(1 + SALT_SIZE, 1 + SALT_SIZE + 16);
      const authTag = tokenData.subarray(1 + SALT_SIZE + 16, 1 + SALT_SIZE + 32);
      const encrypted = tokenData.subarray(1 + SALT_SIZE + 32);

      if (version !== KEY_VERSION) {
        throw new Error('Token was created with an old key version');
      }

      // Try current master key first
      let decrypted: string | null = null;
      const keys = [this.currentMasterKey];
      if (this.previousMasterKey) {
        keys.push(this.previousMasterKey);
      }

      for (const key of keys) {
        try {
          const decryptionKey = this.deriveKey(salt, key);
          const decipher = crypto.createDecipheriv('aes-256-gcm', decryptionKey, iv);
          decipher.setAuthTag(authTag);

          decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
          ]).toString('utf8');
          break;
        } catch (e) {
          continue;
        }
      }

      if (!decrypted) {
        throw new Error('Failed to decrypt token data: Unable to decrypt with any available keys');
      }

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'detokenize',
        details: JSON.stringify({ 
          tokenId: token,
          keyVersion: KEY_VERSION 
        }),
        timestamp: new Date(),
      });

      return JSON.parse(decrypted);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to decrypt token data: ${error.message}. This could be due to data corruption or an invalid token format.`);
      }
      throw new Error('Failed to decrypt token data: Unknown error occurred during decryption.');
    }
  }
}

export const tokenizationService = TokenizationService.getInstance();