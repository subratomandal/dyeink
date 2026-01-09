/**
 * Auth0 JWT Verification Service for Cloudflare Workers
 * Uses the Web Crypto API instead of Node.js crypto
 */

interface JWK {
  kty: string;
  kid: string;
  use: string;
  n: string;
  e: string;
  alg: string;
}

interface JWKS {
  keys: JWK[];
}

interface JWTPayload {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
}

interface JWTHeader {
  alg: string;
  typ: string;
  kid: string;
}

export class Auth0Service {
  private domain: string;
  private audience: string;
  private jwksCache: JWKS | null = null;
  private jwksCacheTime: number = 0;
  private readonly JWKS_CACHE_DURATION = 600000; // 10 minutes

  constructor(domain: string, audience: string) {
    this.domain = domain;
    this.audience = audience;
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header
    const header: JWTHeader = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));

    if (header.alg !== 'RS256') {
      throw new Error('Unsupported algorithm');
    }

    // Get public key
    const jwk = await this.getPublicKey(header.kid);

    // Verify signature
    const isValid = await this.verifySignature(
      `${headerB64}.${payloadB64}`,
      signatureB64,
      jwk
    );

    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const payload: JWTPayload = JSON.parse(
      atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    );

    // Verify claims
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    if (payload.iss !== `https://${this.domain}/`) {
      throw new Error('Invalid issuer');
    }

    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(this.audience)) {
      throw new Error('Invalid audience');
    }

    return payload;
  }

  private async getJWKS(): Promise<JWKS> {
    const now = Date.now();

    if (this.jwksCache && now - this.jwksCacheTime < this.JWKS_CACHE_DURATION) {
      return this.jwksCache;
    }

    const response = await fetch(`https://${this.domain}/.well-known/jwks.json`);

    if (!response.ok) {
      throw new Error('Failed to fetch JWKS');
    }

    this.jwksCache = await response.json() as JWKS;
    this.jwksCacheTime = now;

    return this.jwksCache;
  }

  private async getPublicKey(kid: string): Promise<JWK> {
    const jwks = await this.getJWKS();
    const jwk = jwks.keys.find((key) => key.kid === kid);

    if (!jwk) {
      throw new Error('Public key not found');
    }

    return jwk;
  }

  private async verifySignature(
    data: string,
    signature: string,
    jwk: JWK
  ): Promise<boolean> {
    // Import the public key
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      {
        kty: jwk.kty,
        n: jwk.n,
        e: jwk.e,
        alg: jwk.alg,
        use: jwk.use,
      },
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );

    // Convert base64url signature to ArrayBuffer
    const signatureBuffer = this.base64UrlToArrayBuffer(signature);

    // Convert data to ArrayBuffer
    const dataBuffer = new TextEncoder().encode(data);

    // Verify
    return crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBuffer,
      dataBuffer
    );
  }

  private base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
  }
}
