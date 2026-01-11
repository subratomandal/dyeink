import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

export async function uploadToR2(
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  const client = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME || 'dyeink-images';

  const extension = originalName.split('.').pop() || 'webp';
  const filename = `${nanoid()}_${Date.now()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: buffer,
    ContentType: contentType,
  });

  await client.send(command);

  const publicUrl = process.env.R2_PUBLIC_URL || `https://${bucketName}.r2.dev`;
  return `${publicUrl}/${filename}`;
}

export async function deleteFromR2(imageUrl: string): Promise<void> {
  const client = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME || 'dyeink-images';

  const filename = imageUrl.split('/').pop();
  if (!filename) return;

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: filename,
  });

  await client.send(command);
}
