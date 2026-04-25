/**
 * Password + session primitives using the Web Crypto API only.
 *
 * Workers can't load native modules, so Argon2 is off the table. PBKDF2-SHA256
 * with 600 000 iterations matches OWASP 2023 guidance for password hashing with
 * PBKDF2 and is what 1Password uses.
 *
 * Sessions are signed tokens (HMAC-SHA256) — no server-side store needed.
 * Format: base64url(payload).base64url(signature), where payload is JSON
 * { iat, exp, nonce }. Tokens are served as HTTPOnly / Secure / SameSite=Strict
 * cookies named `dyeink_session`.
 */

const TEXT = new TextEncoder()

const PBKDF2_ITER = 600_000
const PBKDF2_HASH = 'SHA-256'
const PBKDF2_LEN = 32 // bytes → 256 bits

const SESSION_COOKIE = 'dyeink_session'
const SESSION_TTL_SEC = 60 * 60 * 24 * 7 // 7 days

// --- base64url helpers (Workers don't have Buffer) ---

function toBase64Url(bytes: Uint8Array<ArrayBuffer>): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// Returns a Uint8Array backed by a fresh ArrayBuffer (not SharedArrayBuffer).
// Strict TS lib types reject Uint8Array<ArrayBufferLike> → BufferSource since
// SharedArrayBuffer was excluded; the explicit ArrayBuffer parameter fixes it.
function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const arr = new Uint8Array(new ArrayBuffer(n))
  crypto.getRandomValues(arr)
  return arr
}

// --- password hashing ---

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const keyMat = await crypto.subtle.importKey(
    'raw',
    TEXT.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: PBKDF2_HASH },
    keyMat,
    PBKDF2_LEN * 8,
  )
  return `pbkdf2$${PBKDF2_ITER}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iter = parseInt(parts[1], 10)
  const salt = fromBase64Url(parts[2])
  const expected = fromBase64Url(parts[3])

  const keyMat = await crypto.subtle.importKey(
    'raw',
    TEXT.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: iter, hash: PBKDF2_HASH },
      keyMat,
      expected.length * 8,
    ),
  )

  // Constant-time compare
  if (bits.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i]
  return diff === 0
}

// --- session tokens ---

interface SessionPayload {
  iat: number
  exp: number
  nonce: string
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    TEXT.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function createSessionToken(secret: string): Promise<{
  token: string
  cookie: string
  expiresAt: number
}> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    iat: now,
    exp: now + SESSION_TTL_SEC,
    nonce: toBase64Url(randomBytes(12)),
  }
  const payloadB = toBase64Url(TEXT.encode(JSON.stringify(payload)))
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, TEXT.encode(payloadB))
  const token = `${payloadB}.${toBase64Url(new Uint8Array(sig))}`
  return {
    token,
    cookie: serializeSessionCookie(token, SESSION_TTL_SEC),
    expiresAt: payload.exp,
  }
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  const [payloadB, sigB] = token.split('.')
  if (!payloadB || !sigB) return null

  const key = await hmacKey(secret)
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    fromBase64Url(sigB),
    TEXT.encode(payloadB),
  )
  if (!ok) return null

  try {
    const payload: SessionPayload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB)))
    if (Math.floor(Date.now() / 1000) > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export function serializeSessionCookie(token: string, maxAgeSec: number): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${maxAgeSec}`,
  ].join('; ')
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
}

export function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=')
    if (idx === -1) continue
    const k = pair.slice(0, idx).trim()
    if (k === SESSION_COOKIE) return pair.slice(idx + 1).trim()
  }
  return null
}

// --- misc helpers ---

/** Generate a base64url random string of `bytes` raw bytes. */
export function randomToken(bytes = 32): string {
  return toBase64Url(randomBytes(bytes))
}
