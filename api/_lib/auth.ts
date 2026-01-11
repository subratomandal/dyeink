import { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

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

export interface AuthUser {
  id: string;
  auth0Id: string;
  email: string;
  name: string;
  picture?: string;
}

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.AUTH0_AUDIENCE,
        issuer: `https://${process.env.AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(decoded as JWTPayload);
      }
    );
  });
}

export async function getAuthUser(req: VercelRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = await verifyToken(token);

    return {
      id: decoded.sub.replace('|', '_'),
      auth0Id: decoded.sub,
      email: decoded.email || '',
      name: decoded.name || '',
      picture: decoded.picture,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function unauthorized(message = 'Unauthorized') {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: message }),
  };
}
