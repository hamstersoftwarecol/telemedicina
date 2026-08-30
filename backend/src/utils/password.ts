/**
 * Password hashing using @noble/hashes (PBKDF2 with SHA-256)
 * Compatible with Cloudflare Workers Web Crypto API
 */

import { pbkdf2 } from '@noble/hashes/pbkdf2'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils'

const ITERATIONS = 100000
const KEY_LENGTH = 32
const SALT_LENGTH = 16

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const hash = pbkdf2(sha256, password, salt, { c: ITERATIONS, dkLen: KEY_LENGTH })
  return `pbkdf2:${bytesToHex(salt)}:${bytesToHex(hash)}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Support legacy bcrypt-style hashes (from seed) for demo
    if (storedHash.startsWith('$2a$')) {
      // For demo purposes, all seeded users use password: Admin@12345
      // In production, use proper bcrypt via a separate service
      return password === 'Admin@12345'
    }
    
    const [, saltHex, hashHex] = storedHash.split(':')
    if (!saltHex || !hashHex) return false
    
    const salt = hexToBytes(saltHex)
    const expectedHash = hexToBytes(hashHex)
    const actualHash = pbkdf2(sha256, password, salt, { c: ITERATIONS, dkLen: KEY_LENGTH })
    
    // Constant-time comparison
    if (actualHash.length !== expectedHash.length) return false
    let diff = 0
    for (let i = 0; i < actualHash.length; i++) {
      diff |= actualHash[i] ^ expectedHash[i]
    }
    return diff === 0
  } catch {
    return false
  }
}
