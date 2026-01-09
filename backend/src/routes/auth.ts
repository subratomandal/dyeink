import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { User, SiteSettings } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';
import axios from 'axios';

interface RegisterBody {
  auth0Id: string;
  email: string;
  name?: string;
  picture?: string;
}

interface DeleteUserBody {
  userId: string;
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register/sync user from Auth0
  fastify.post<{ Body: RegisterBody }>(
    '/auth/register',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        const { auth0Id, email, name, picture } = request.body;
        const userId = auth0Id.replace('|', '_');

        // Check if user exists
        let user = await User.findOne({ auth0Id });

        if (user) {
          // Update existing user
          user.email = email;
          user.name = name || user.name;
          user.picture = picture || user.picture;
          await user.save();
        } else {
          // Create new user
          user = await User.create({
            _id: userId,
            auth0Id,
            email,
            name: name || '',
            picture,
            isAdmin: false,
          });

          // Create default site settings
          const subdomain = `blog-${userId.slice(0, 8)}`;
          await SiteSettings.create({
            userId: user._id,
            siteName: name || 'My Blog',
            siteDescription: '',
            subdomain,
          });
        }

        return {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      } catch (error: any) {
        console.error('Register error:', error);
        reply.code(500).send({ error: 'Failed to register user' });
      }
    }
  );

  // Get current user
  fastify.get(
    '/auth/me',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const user = await User.findById(request.user.id);

        if (!user) {
          return reply.code(404).send({ error: 'User not found' });
        }

        return {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      } catch (error: any) {
        console.error('Get user error:', error);
        reply.code(500).send({ error: 'Failed to get user' });
      }
    }
  );

  // Delete user account
  fastify.delete(
    '/auth/delete',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const userId = request.user.id;

        // Delete user from Auth0 using Management API
        const auth0Domain = process.env.AUTH0_DOMAIN;
        const mgmtToken = process.env.AUTH0_MANAGEMENT_API_TOKEN;

        if (auth0Domain && mgmtToken) {
          try {
            await axios.delete(
              `https://${auth0Domain}/api/v2/users/${request.user.auth0Id}`,
              {
                headers: {
                  Authorization: `Bearer ${mgmtToken}`,
                },
              }
            );
          } catch (error) {
            console.error('Failed to delete Auth0 user:', error);
          }
        }

        // Delete user data from MongoDB
        await Promise.all([
          User.findByIdAndDelete(userId),
          SiteSettings.findOneAndDelete({ userId }),
          // Posts will be orphaned but can be cleaned up later
        ]);

        return { success: true };
      } catch (error: any) {
        console.error('Delete user error:', error);
        reply.code(500).send({ error: 'Failed to delete user' });
      }
    }
  );
}
