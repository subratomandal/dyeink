import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { trackEvent, getBasicStats } from '../services/stats.js';
import { Post } from '../models/index.js';

export async function statsRoutes(fastify: FastifyInstance): Promise<void> {
  // Track view/share event (public endpoint)
  fastify.get<{ Querystring: { id: string; type: 'view' | 'share' } }>(
    '/hit',
    async (request, reply) => {
      try {
        const { id, type } = request.query;

        if (!id || !type || !['view', 'share'].includes(type)) {
          return reply.code(400).send({ error: 'Invalid parameters' });
        }

        // Verify post exists
        const post = await Post.findById(id);
        if (!post) {
          return reply.code(404).send({ error: 'Post not found' });
        }

        await trackEvent(id, type);

        return { ok: true };
      } catch (error: any) {
        console.error('Track event error:', error);
        reply.code(500).send({ error: 'Failed to track event' });
      }
    }
  );

  // Get dashboard stats
  fastify.get(
    '/stats',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const stats = await getBasicStats(request.user.id);

        return stats;
      } catch (error: any) {
        console.error('Get stats error:', error);
        reply.code(500).send({ error: 'Failed to get stats' });
      }
    }
  );

  // Get stats for a specific user (by userId)
  fastify.get<{ Params: { userId: string } }>(
    '/stats/:userId',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const { userId } = request.params;

        // Only allow users to access their own stats
        if (request.user.id !== userId && !request.user.isAdmin) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        const stats = await getBasicStats(userId);

        return stats;
      } catch (error: any) {
        console.error('Get user stats error:', error);
        reply.code(500).send({ error: 'Failed to get stats' });
      }
    }
  );
}
