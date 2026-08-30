/**
 * Cloudflare Bindings type definitions
 */

export interface Bindings {
  DB: D1Database
  R2: R2Bucket
  KV: KVNamespace
  JWT_SECRET: string
  JWT_REFRESH_SECRET: string
  JWT_EXPIRES_IN: string
  JWT_REFRESH_EXPIRES_IN: string
  FRONTEND_URL: string
  TURNSTILE_SECRET_KEY: string
  APP_NAME: string
  APP_ENV: string
  GEMINI_API_KEY?: string
  RESEND_API_KEY?: string
  TWILIO_ACCOUNT_SID?: string
  TWILIO_AUTH_TOKEN: string
  TWILIO_PHONE_NUMBER: string
  CLOUDFLARE_API_TOKEN: string
  CLOUDFLARE_ACCOUNT_ID: string
  CLOUDFLARE_PAGES_PROJECT: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
}

export interface JWTPayload {
  sub: string        // user id
  email: string
  role: string
  roleId: number
  iat: number
  exp: number
}

export interface AppUser {
  id: number
  email: string
  first_name: string
  last_name: string
  role_id: number
  role_name: string
  is_active: number
}

export type Variables = {
  user: AppUser
}
