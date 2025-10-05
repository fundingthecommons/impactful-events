import { createHash, randomBytes, pbkdf2Sync, createCipher, createDecipher } from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000; // High iteration count for security

// Get the app secret for key derivation
function getAppSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is required for encryption');
  }
  return secret;
}

// Generate a cryptographically secure random salt
export function generateSalt(): string {
  return randomBytes(SALT_LENGTH).toString('hex');
}

// Generate a cryptographically secure random IV
export function generateIV(): string {
  return randomBytes(IV_LENGTH).toString('hex');
}

// Derive encryption key from user ID and app secret
function deriveKey(userId: string, salt: string): Buffer {
  const appSecret = getAppSecret();
  const keyMaterial = `${userId}:${appSecret}`;
  return pbkdf2Sync(keyMaterial, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

// Encrypt data using AES-256-GCM
export function encryptData(data: string, userId: string, salt: string, _iv: string): string {
  try {
    const key = deriveKey(userId, salt);
    const cipher = createCipher(ALGORITHM, key) as {
      setAAD?: (buffer: Buffer) => void;
      update: (data: Buffer | string, inputEncoding?: BufferEncoding, outputEncoding?: BufferEncoding) => string;
      final: (outputEncoding?: BufferEncoding) => string;
      getAuthTag?: () => Buffer;
    };
    
    if (cipher.setAAD) {
      cipher.setAAD(Buffer.from(userId, 'utf8')); // Additional authenticated data
    }
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag?.() ?? Buffer.alloc(16);
    
    // Combine encrypted data with auth tag
    return encrypted + authTag.toString('hex');
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Decrypt data using AES-256-GCM
export function decryptData(encryptedData: string, userId: string, salt: string, _iv: string): string {
  try {
    const key = deriveKey(userId, salt);
    
    // Split encrypted data and auth tag
    const authTagHex = encryptedData.slice(-TAG_LENGTH * 2);
    const encrypted = encryptedData.slice(0, -TAG_LENGTH * 2);
    
    const decipher = createDecipher(ALGORITHM, key) as {
      setAAD?: (buffer: Buffer) => void;
      update: (data: Buffer | string, inputEncoding?: BufferEncoding, outputEncoding?: BufferEncoding) => string;
      final: (outputEncoding?: BufferEncoding) => string;
      setAuthTag?: (buffer: Buffer) => void;
    };
    if (decipher.setAAD) {
      decipher.setAAD(Buffer.from(userId, 'utf8')); // Additional authenticated data
    }
    if (decipher.setAuthTag) {
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    }
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Invalid data or key'}`);
  }
}

// Encrypt Telegram session data
export interface TelegramCredentials {
  sessionString: string;
  apiHash: string;
}

export interface EncryptedTelegramAuth {
  encryptedSession: string;
  encryptedApiHash: string;
  salt: string;
  iv: string;
}

export function encryptTelegramCredentials(
  credentials: TelegramCredentials,
  userId: string
): EncryptedTelegramAuth {
  const salt = generateSalt();
  const iv = generateIV();
  
  return {
    encryptedSession: encryptData(credentials.sessionString, userId, salt, iv),
    encryptedApiHash: encryptData(credentials.apiHash, userId, salt, iv),
    salt,
    iv,
  };
}

export function decryptTelegramCredentials(
  encrypted: EncryptedTelegramAuth,
  userId: string
): TelegramCredentials {
  return {
    sessionString: decryptData(encrypted.encryptedSession, userId, encrypted.salt, encrypted.iv),
    apiHash: decryptData(encrypted.encryptedApiHash, userId, encrypted.salt, encrypted.iv),
  };
}

// Secure comparison to prevent timing attacks
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// Generate session expiration date (30 days from now)
export function getSessionExpiration(): Date {
  const expirationMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  return new Date(Date.now() + expirationMs);
}

// Check if session is expired
export function isSessionExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

// Hash sensitive data for audit logging (one-way)
export function hashForAudit(data: string): string {
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}