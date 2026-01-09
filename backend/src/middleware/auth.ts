import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { User } from '../models/index.js';

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

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      auth0Id: string;
      email: string;
      name: string;
      picture?: string;
      isAdmin: boolean;
    };
  }
}

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
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

export async function verifyAuth0Token(token: string): Promise<JWTPayload> {
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

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAuth0Token(token);

    // Find or create user in database
    let user = await User.findOne({ auth0Id: decoded.sub });

    if (!user) {
      // Create new user
      const userId = decoded.sub.replace('|', '_');
      user = await User.create({
        _id: userId,
        auth0Id: decoded.sub,
        email: decoded.email || '',
        name: decoded.name || '',
        picture: decoded.picture,
        isAdmin: false,
      });
    }

    request.user = {
      id: user._id,
      auth0Id: user.auth0Id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      isAdmin: user.isAdmin,
    };
  } catch (error) {
    console.error('Auth error:', error);
    reply.code(401).send({ error: 'Invalid or expired token' });
  }
}

export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return;
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAuth0Token(token);

    const user = await User.findOne({ auth0Id: decoded.sub });

    if (user) {
      request.user = {
        id: user._id,
        auth0Id: user.auth0Id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        isAdmin: user.isAdmin,
      };
    }
  } catch (error) {
    // Optional auth - don't fail on error
    console.log('Optional auth failed:', error);
  }
}
