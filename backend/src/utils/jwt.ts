/**
 * JWT utility functions using jose (Web Crypto compatible)
 */

import { SignJWT, jwtVerify } from 'jose'
import { JWTPayload } from '../types'

export async function signToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: string = '15m'
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)
  
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey)
}

export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}
