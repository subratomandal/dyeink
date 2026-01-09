import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SiteSettings } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

interface UpdateSettingsBody {
  siteName?: string;
  siteDescription?: string;
  customDomain?: string | null;
  subdomain?: string | null;
  twitterLink?: string | null;
  linkedinLink?: string | null;
  githubLink?: string | null;
  websiteLink?: string | null;
  dribbbleLink?: string | null;
  huggingfaceLink?: string | null;
  leetcodeLink?: string | null;
  newsletterEmail?: string | null;
  domainStatus?: string | null;
  verifyToken?: string | null;
}

function formatSettings(settings: any) {
  return {
    id: settings._id,
    userId: settings.userId,
    siteName: settings.siteName,
    siteDescription: settings.siteDescription,
    customDomain: settings.customDomain,
    subdomain: settings.subdomain,
    twitterLink: settings.twitterLink,
    linkedinLink: settings.linkedinLink,
    githubLink: settings.githubLink,
    websiteLink: settings.websiteLink,
    dribbbleLink: settings.dribbbleLink,
    huggingfaceLink: settings.huggingfaceLink,
    leetcodeLink: settings.leetcodeLink,
    newsletterEmail: settings.newsletterEmail,
    domainStatus: settings.domainStatus,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  // Get current user's settings
  fastify.get(
    '/settings',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        let settings = await SiteSettings.findOne({ userId: request.user.id });

        if (!settings) {
          // Create default settings
          const subdomain = `blog-${request.user.id.slice(0, 8)}`;
          settings = await SiteSettings.create({
            userId: request.user.id,
            siteName: request.user.name || 'My Blog',
            siteDescription: '',
            subdomain,
          });
        }

        return formatSettings(settings);
      } catch (error: any) {
        console.error('Get settings error:', error);
        reply.code(500).send({ error: 'Failed to get settings' });
      }
    }
  );

  // Get public settings by subdomain
  fastify.get<{ Params: { subdomain: string } }>(
    '/settings/subdomain/:subdomain',
    async (request, reply) => {
      try {
        const { subdomain } = request.params;
        const settings = await SiteSettings.findOne({ subdomain });

        if (!settings) {
          return reply.code(404).send({ error: 'Blog not found' });
        }

        return formatSettings(settings);
      } catch (error: any) {
        console.error('Get settings by subdomain error:', error);
        reply.code(500).send({ error: 'Failed to get settings' });
      }
    }
  );

  // Get public settings by custom domain
  fastify.get<{ Params: { domain: string } }>(
    '/settings/domain/:domain',
    async (request, reply) => {
      try {
        const { domain } = request.params;
        const settings = await SiteSettings.findOne({
          customDomain: { $regex: new RegExp(`^${domain}$`, 'i') },
        });

        if (!settings) {
          return reply.code(404).send({ error: 'Blog not found' });
        }

        return formatSettings(settings);
      } catch (error: any) {
        console.error('Get settings by domain error:', error);
        reply.code(500).send({ error: 'Failed to get settings' });
      }
    }
  );

  // Update settings
  fastify.put<{ Body: UpdateSettingsBody }>(
    '/settings',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const updates = request.body;

        // Check subdomain uniqueness if changing
        if (updates.subdomain) {
          const existingSubdomain = await SiteSettings.findOne({
            subdomain: updates.subdomain,
            userId: { $ne: request.user.id },
          });

          if (existingSubdomain) {
            return reply.code(400).send({ error: 'Subdomain already taken' });
          }
        }

        // Check custom domain uniqueness if changing
        if (updates.customDomain) {
          const existingDomain = await SiteSettings.findOne({
            customDomain: { $regex: new RegExp(`^${updates.customDomain}$`, 'i') },
            userId: { $ne: request.user.id },
          });

          if (existingDomain) {
            return reply.code(400).send({ error: 'Custom domain already in use' });
          }
        }

        const settings = await SiteSettings.findOneAndUpdate(
          { userId: request.user.id },
          updates,
          { new: true, upsert: true }
        );

        return formatSettings(settings);
      } catch (error: any) {
        console.error('Update settings error:', error);
        reply.code(500).send({ error: 'Failed to update settings' });
      }
    }
  );

  // Initialize settings (for new users)
  fastify.post<{ Body: UpdateSettingsBody }>(
    '/settings/initialize',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        // Check if settings already exist
        let settings = await SiteSettings.findOne({ userId: request.user.id });

        if (settings) {
          return formatSettings(settings);
        }

        const { siteName, siteDescription, subdomain } = request.body;
        const defaultSubdomain = subdomain || `blog-${request.user.id.slice(0, 8)}`;

        settings = await SiteSettings.create({
          userId: request.user.id,
          siteName: siteName || request.user.name || 'My Blog',
          siteDescription: siteDescription || '',
          subdomain: defaultSubdomain,
        });

        return formatSettings(settings);
      } catch (error: any) {
        console.error('Initialize settings error:', error);
        reply.code(500).send({ error: 'Failed to initialize settings' });
      }
    }
  );
}
