import type { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import mime from 'mime-types';
import { requireAuth } from '../../middleware/auth.js';
import { env } from '../../config/env.js';
import { UploadPolicy } from '@acme/shared';

export async function registerUploadRoutes(app: FastifyInstance) {
  const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
  await fs.mkdir(uploadDir, { recursive: true });

  app.post('/uploads', { preHandler: requireAuth }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.badRequest('No file');
    if (data.file.truncated) return reply.badRequest('File too large');
    if (data.file.bytesRead > UploadPolicy.maxSize) return reply.badRequest('File too large');

    const buffer = await data.toBuffer();
    const mimeType = data.mimetype;
    if (!UploadPolicy.allowedMime.includes(mimeType)) {
      return reply.badRequest('Unsupported file type');
    }

    const ext = mime.extension(mimeType) ?? 'bin';
    const filename = `${randomUUID()}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    if (mimeType.startsWith('image/')) {
      const thumbName = `${randomUUID()}-thumb.${ext}`;
      const thumbPath = path.join(uploadDir, thumbName);
      await sharp(buffer).resize(256, 256, { fit: 'inside' }).toFile(thumbPath);
    }

    const url = `/uploads/${filename}`;
    return { url };
  });
}
