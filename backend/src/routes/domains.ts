import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SiteSettings } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { addDomainToVercel, verifyDomain, removeDomainFromVercel } from '../services/domain.js';

interface AddDomainBody {
  domain: string;
}

export async function domainsRoutes(fastify: FastifyInstance): Promise<void> {
  // Add custom domain
  fastify.post<{ Body: AddDomainBody }>(
    '/domains',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const { domain } = request.body;

        if (!domain) {
          return reply.code(400).send({ error: 'Domain is required' });
        }

        // Check if domain is already in use
        const existingSettings = await SiteSettings.findOne({
          customDomain: { $regex: new RegExp(`^${domain}$`, 'i') },
          userId: { $ne: request.user.id },
        });

        if (existingSettings) {
          return reply.code(400).send({ error: 'Domain already in use' });
        }

        // Add domain to Vercel
        const result = await addDomainToVercel(domain);

        // Update settings
        await SiteSettings.findOneAndUpdate(
          { userId: request.user.id },
          {
            customDomain: domain,
            domainStatus: result.verified ? 'verified' : 'pending',
          }
        );

        return {
          success: true,
          verified: result.verified,
          verification: result.verification,
        };
      } catch (error: any) {
        console.error('Add domain error:', error);
        reply.code(500).send({ error: 'Failed to add domain' });
      }
    }
  );

  // Verify domain
  fastify.get<{ Querystring: { domain: string } }>(
    '/domains/verify',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const { domain } = request.query;

        if (!domain) {
          return reply.code(400).send({ error: 'Domain is required' });
        }

        // Verify ownership
        const settings = await SiteSettings.findOne({
          userId: request.user.id,
          customDomain: { $regex: new RegExp(`^${domain}$`, 'i') },
        });

        if (!settings) {
          return reply.code(404).send({ error: 'Domain not found' });
        }

        // Check verification status with Vercel
        const result = await verifyDomain(domain);

        // Update status
        if (result.verified) {
          await SiteSettings.findByIdAndUpdate(settings._id, {
            domainStatus: 'active',
          });
        }

        return {
          verified: result.verified,
          verification: result.verification,
        };
      } catch (error: any) {
        console.error('Verify domain error:', error);
        reply.code(500).send({ error: 'Failed to verify domain' });
      }
    }
  );

  // Get domain status
  fastify.get(
    '/domains/status',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const settings = await SiteSettings.findOne({ userId: request.user.id });

        if (!settings || !settings.customDomain) {
          return { hasDomain: false };
        }

        // Get current status from Vercel
        const result = await verifyDomain(settings.customDomain);

        return {
          hasDomain: true,
          domain: settings.customDomain,
          status: settings.domainStatus,
          verified: result.verified,
          verification: result.verification,
        };
      } catch (error: any) {
        console.error('Get domain status error:', error);
        reply.code(500).send({ error: 'Failed to get domain status' });
      }
    }
  );

  // Remove custom domain
  fastify.delete(
    '/domains',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const settings = await SiteSettings.findOne({ userId: request.user.id });

        if (!settings || !settings.customDomain) {
          return reply.code(404).send({ error: 'No custom domain configured' });
        }

        // Remove from Vercel
        try {
          await removeDomainFromVercel(settings.customDomain);
        } catch (error) {
          console.error('Failed to remove domain from Vercel:', error);
        }

        // Update settings
        await SiteSettings.findByIdAndUpdate(settings._id, {
          customDomain: null,
          domainStatus: null,
        });

        return { success: true };
      } catch (error: any) {
        console.error('Remove domain error:', error);
        reply.code(500).send({ error: 'Failed to remove domain' });
      }
    }
  );
}
