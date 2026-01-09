import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return s3Client;
}

export async function uploadImage(
  file: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  const client = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME || 'dyeink-images';

  // Generate unique filename
  const extension = originalName.split('.').pop() || 'webp';
  const filename = `${nanoid()}_${Date.now()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: file,
    ContentType: contentType,
  });

  await client.send(command);

  // Return public URL
  const publicUrl = process.env.R2_PUBLIC_URL || `https://${bucketName}.r2.dev`;
  return `${publicUrl}/${filename}`;
}

export async function deleteImage(imageUrl: string): Promise<void> {
  const client = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME || 'dyeink-images';

  // Extract filename from URL
  const filename = imageUrl.split('/').pop();

  if (!filename) {
    throw new Error('Invalid image URL');
  }

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: filename,
  });

  await client.send(command);
}

export async function getPresignedUploadUrl(
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const client = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME || 'dyeink-images';

  const uniqueFilename = `${nanoid()}_${Date.now()}_${filename}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: uniqueFilename,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  const publicUrl = `${process.env.R2_PUBLIC_URL || `https://${bucketName}.r2.dev`}/${uniqueFilename}`;

  return { uploadUrl, publicUrl };
}
