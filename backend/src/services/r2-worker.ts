/**
 * R2 Storage Service for Cloudflare Workers
 * Uses the R2 binding directly
 */

export class R2StorageService {
  private bucket: R2Bucket;
  private publicUrl: string;

  constructor(bucket: R2Bucket, publicUrl: string) {
    this.bucket = bucket;
    this.publicUrl = publicUrl;
  }

  async uploadImage(
    file: ArrayBuffer,
    contentType: string,
    filename: string
  ): Promise<string> {
    const uniqueFilename = `${crypto.randomUUID()}_${Date.now()}_${filename}`;

    await this.bucket.put(uniqueFilename, file, {
      httpMetadata: {
        contentType,
      },
    });

    return `${this.publicUrl}/${uniqueFilename}`;
  }

  async deleteImage(imageUrl: string): Promise<void> {
    const filename = imageUrl.split('/').pop();

    if (!filename) {
      throw new Error('Invalid image URL');
    }

    await this.bucket.delete(filename);
  }

  async getImage(filename: string): Promise<R2ObjectBody | null> {
    return this.bucket.get(filename);
  }
}
