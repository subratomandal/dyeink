import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import {
  authRoutes,
  postsRoutes,
  settingsRoutes,
  statsRoutes,
  subscribersRoutes,
  domainsRoutes,
  uploadRoutes,
} from './routes/index.js';

// Load environment variables
dotenv.config();

const fastify = Fastify({
  logger: true,
});

// Register plugins
fastify.register(cors, {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

fastify.register(formbody);
fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
fastify.register(authRoutes, { prefix: '/api' });
fastify.register(postsRoutes, { prefix: '/api' });
fastify.register(settingsRoutes, { prefix: '/api' });
fastify.register(statsRoutes, { prefix: '/api' });
fastify.register(subscribersRoutes, { prefix: '/api' });
fastify.register(domainsRoutes, { prefix: '/api' });
fastify.register(uploadRoutes, { prefix: '/api' });

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal Server Error',
  });
});

// Start server
const start = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`Server running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export default fastify;
