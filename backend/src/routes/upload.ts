import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { uploadImage, deleteImage, getPresignedUploadUrl } from '../services/storage.js';

interface PresignedUrlBody {
  filename: string;
  contentType: string;
}

export async function uploadRoutes(fastify: FastifyInstance): Promise<void> {
  // Upload image directly
  fastify.post(
    '/upload',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const data = await request.file();

        if (!data) {
          return reply.code(400).send({ error: 'No file uploaded' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(data.mimetype)) {
          return reply.code(400).send({ error: 'Invalid file type' });
        }

        // Validate file size (max 10MB)
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        if (buffer.length > 10 * 1024 * 1024) {
          return reply.code(400).send({ error: 'File too large (max 10MB)' });
        }

        const imageUrl = await uploadImage(buffer, data.mimetype, data.filename);

        return { url: imageUrl };
      } catch (error: any) {
        console.error('Upload error:', error);
        reply.code(500).send({ error: 'Failed to upload image' });
      }
    }
  );

  // Get presigned URL for client-side upload
  fastify.post<{ Body: PresignedUrlBody }>(
    '/upload/presigned',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const { filename, contentType } = request.body;

        if (!filename || !contentType) {
          return reply.code(400).send({ error: 'Filename and content type required' });
        }

        // Validate content type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(contentType)) {
          return reply.code(400).send({ error: 'Invalid file type' });
        }

        const { uploadUrl, publicUrl } = await getPresignedUploadUrl(filename, contentType);

        return { uploadUrl, publicUrl };
      } catch (error: any) {
        console.error('Get presigned URL error:', error);
        reply.code(500).send({ error: 'Failed to get upload URL' });
      }
    }
  );

  // Delete image
  fastify.delete<{ Body: { imageUrl: string } }>(
    '/upload',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({ error: 'Not authenticated' });
        }

        const { imageUrl } = request.body;

        if (!imageUrl) {
          return reply.code(400).send({ error: 'Image URL required' });
        }

        await deleteImage(imageUrl);

        return { success: true };
      } catch (error: any) {
        console.error('Delete image error:', error);
        reply.code(500).send({ error: 'Failed to delete image' });
      }
    }
  );
}
