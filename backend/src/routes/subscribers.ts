import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Subscriber, SiteSettings } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';

interface SubscribeBody {
  email: string;
  blogId?: string;
  subdomain?: string;
  customDomain?: string;
}

export async function subscribersRoutes(fastify: FastifyInstance): Promise<void> {
  // Subscribe to a blog (public endpoint)
  fastify.post<{ Body: SubscribeBody }>(
    '/subscribe',
    async (request, reply) => {
      try {
        const { email, blogId, subdomain, customDomain } = request.body;

        if (!email) {
          return reply.code(400).send({ error: 'Email is required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return reply.code(400).send({ error: 'Invalid email format' });
        }

        // Find the blog
        let settings;
        if (blogId) {
          settings = await SiteSettings.findById(blogId);
        } else if (subdomain) {
          settings = await SiteSettings.findOne({ subdomain });
        } else if (customDomain) {
          settings = await SiteSettings.findOne({
            customDomain: { $regex: new RegExp(`^${customDomain}$`, 'i') },
          });
        }

        if (!settings) {
          return reply.code(404).send({ error: 'Blog not found' });
        }

        // Check if already subscribed
        const existingSubscriber = await Subscriber.findOne({
          email: email.toLowerCase(),
          blogId: settings._id,
        });

        if (existingSubscriber) {
          if (!existingSubscriber.active) {
            // Reactivate subscription
            existingSubscriber.active = true;
            await existingSubscriber.save();
            return { ok: true, message: 'Subscription reactivated' };
          }
          return { ok: true, message: 'Already subscribed' };
        }

        // Create new subscriber
        await Subscriber.create({
          email: email.toLowerCase(),
          blogId: settings._id,
          active: true,
          verified: false,
        });

        return { ok: true, message: 'Subscribed successfully' };
      } catch (error: any) {
        console.error('Subscribe error:', error);
        reply.code(500).send({ error: 'Failed to subscribe' });
      }
    }
  );

  // Get subscribers for current user's blog
  fastify.get(
    '/subscribers',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const settings = await SiteSettings.findOne({ userId: request.user.id });

        if (!settings) {
          return { subscribers: [], total: 0 };
        }

        const subscribers = await Subscriber.find({
          blogId: settings._id,
          active: true,
        }).sort({ createdAt: -1 });

        return {
          subscribers: subscribers.map((s) => ({
            id: s._id,
            email: s.email,
            verified: s.verified,
            createdAt: s.createdAt,
          })),
          total: subscribers.length,
        };
      } catch (error: any) {
        console.error('Get subscribers error:', error);
        reply.code(500).send({ error: 'Failed to get subscribers' });
      }
    }
  );

  // Unsubscribe (by subscriber ID)
  fastify.delete<{ Params: { id: string } }>(
    '/subscribers/:id',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const { id } = request.params;

        // Verify ownership
        const settings = await SiteSettings.findOne({ userId: request.user.id });

        if (!settings) {
          return reply.code(404).send({ error: 'Blog not found' });
        }

        const subscriber = await Subscriber.findOne({
          _id: id,
          blogId: settings._id,
        });

        if (!subscriber) {
          return reply.code(404).send({ error: 'Subscriber not found' });
        }

        await Subscriber.findByIdAndDelete(id);

        return { success: true };
      } catch (error: any) {
        console.error('Delete subscriber error:', error);
        reply.code(500).send({ error: 'Failed to delete subscriber' });
      }
    }
  );

  // Public unsubscribe (by email and blog)
  fastify.post<{ Body: { email: string; subdomain?: string; customDomain?: string } }>(
    '/unsubscribe',
    async (request, reply) => {
      try {
        const { email, subdomain, customDomain } = request.body;

        if (!email) {
          return reply.code(400).send({ error: 'Email is required' });
        }

        let settings;
        if (subdomain) {
          settings = await SiteSettings.findOne({ subdomain });
        } else if (customDomain) {
          settings = await SiteSettings.findOne({
            customDomain: { $regex: new RegExp(`^${customDomain}$`, 'i') },
          });
        }

        if (!settings) {
          return reply.code(404).send({ error: 'Blog not found' });
        }

        await Subscriber.findOneAndUpdate(
          { email: email.toLowerCase(), blogId: settings._id },
          { active: false }
        );

        return { ok: true, message: 'Unsubscribed successfully' };
      } catch (error: any) {
        console.error('Unsubscribe error:', error);
        reply.code(500).send({ error: 'Failed to unsubscribe' });
      }
    }
  );
}
