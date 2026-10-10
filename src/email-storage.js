import { EMAIL_TOKEN_PATTERN, MAX_MESSAGE_LENGTH } from '../shared/analysis-link.ts'

export const DEFAULT_EMAIL_TTL_SECONDS = 24 * 60 * 60

export function emailTtl(env) {
  const configured = Number(env.EMAIL_TTL_SECONDS ?? DEFAULT_EMAIL_TTL_SECONDS)
  if (!Number.isInteger(configured) || configured < 3600 || configured > 7 * 86400) {
    throw new Error('Email link expiry is not configured correctly.')
  }
  return configured
}

async function storageKey(token) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return 'email:' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function storeEmailBody(env, message) {
  if (!env.EMAIL_MESSAGES || typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE_LENGTH) {
    throw new Error('Email link storage is unavailable.')
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const token = globalThis.btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const key = await storageKey(token)
  const ttlSeconds = emailTtl(env)
  const expiresAt = Date.now() + ttlSeconds * 1000
  // Store only the parsed body and expiry; never sender, subject, headers or attachments.
  await env.EMAIL_MESSAGES.put(key, JSON.stringify({ message, expiresAt }), { expirationTtl: ttlSeconds })
  return { token, key, ttlSeconds }
}

const response = (payload, status = 200, extra = {}) => Response.json(payload, {
  status,
  headers: {
    'Cache-Control': 'private, no-store',
    'Pragma': 'no-cache',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  },
})

async function readToken(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json') || !request.body) return null
  const reader = request.body.getReader()
  const bytes = new Uint8Array(512)
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (length + value.byteLength > bytes.length) {
        await reader.cancel()
        return null
      }
      bytes.set(value, length)
      length += value.byteLength
    }
    return JSON.parse(new globalThis.TextDecoder().decode(bytes.subarray(0, length)))?.token
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}

export async function retrieveEmailBody(request, env) {
  // Tokens travel in a POST body, never server URLs or URL access logs.
  if (request.method !== 'POST') return response({ error: 'Use POST to open an email link.' }, 405, { Allow: 'POST' })
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return response({ error: 'Open this link on the analysis website.' }, 403)
  const token = await readToken(request)
  if (typeof token !== 'string' || !EMAIL_TOKEN_PATTERN.test(token)) return response({ error: 'This email link is damaged.' }, 400)
  if (!env.EMAIL_MESSAGES) return response({ error: 'Email links are temporarily unavailable. Please retry later.' }, 503)
  try {
    const stored = await env.EMAIL_MESSAGES.get(await storageKey(token), { type: 'json', cacheTtl: 30 })
    if (!stored) {
      return response({ error: 'This link is unavailable or expired. For a newly received email, wait a minute and retry.' }, 404, { 'Retry-After': '30' })
    }
    if (!Number.isFinite(stored.expiresAt) || stored.expiresAt <= Date.now()) {
      return response({ error: 'This email link has expired. Send the email again or paste the message manually.' }, 410)
    }
    if (typeof stored.message !== 'string' || !stored.message.trim() || stored.message.length > MAX_MESSAGE_LENGTH) {
      return response({ error: 'This email link could not be read safely. Paste the message manually.' }, 410)
    }
    return response({ message: stored.message, expiresAt: stored.expiresAt })
  } catch {
    // Storage exceptions may contain keys or values. Never log them.
    return response({ error: 'Email links are temporarily unavailable. Please retry later.' }, 503)
  }
}
