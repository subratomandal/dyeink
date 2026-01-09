/**
 * MongoDB Data API Service for Cloudflare Workers
 * Uses HTTP requests instead of native MongoDB driver
 */

export class MongoDBService {
  private apiUrl: string;
  private apiKey: string;
  private database: string;

  constructor(apiUrl: string, apiKey: string, database: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.database = database;
  }

  private async request(action: string, body: any): Promise<any> {
    const response = await fetch(`${this.apiUrl}/action/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        dataSource: 'Cluster0',
        database: this.database,
        ...body,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MongoDB API error: ${error}`);
    }

    return response.json();
  }

  async findOne(collection: string, filter: any): Promise<any> {
    const result = await this.request('findOne', { collection, filter });
    return result.document;
  }

  async find(collection: string, filter: any, options?: { sort?: any; limit?: number; skip?: number }): Promise<any[]> {
    const body: any = { collection, filter };

    if (options?.sort) body.sort = options.sort;
    if (options?.limit) body.limit = options.limit;
    if (options?.skip) body.skip = options.skip;

    const result = await this.request('find', body);
    return result.documents || [];
  }

  async insertOne(collection: string, document: any): Promise<any> {
    const result = await this.request('insertOne', { collection, document });
    return { ...document, _id: result.insertedId };
  }

  async updateOne(collection: string, filter: any, update: any, options?: { upsert?: boolean }): Promise<any> {
    const body: any = { collection, filter, update };

    if (options?.upsert) body.upsert = true;

    const result = await this.request('updateOne', body);

    // Fetch the updated document
    const updated = await this.findOne(collection, filter);
    return updated;
  }

  async deleteOne(collection: string, filter: any): Promise<{ deletedCount: number }> {
    const result = await this.request('deleteOne', { collection, filter });
    return { deletedCount: result.deletedCount };
  }

  async deleteMany(collection: string, filter: any): Promise<{ deletedCount: number }> {
    const result = await this.request('deleteMany', { collection, filter });
    return { deletedCount: result.deletedCount };
  }

  async aggregate(collection: string, pipeline: any[]): Promise<any[]> {
    const result = await this.request('aggregate', { collection, pipeline });
    return result.documents || [];
  }

  async countDocuments(collection: string, filter: any): Promise<number> {
    const result = await this.request('aggregate', {
      collection,
      pipeline: [{ $match: filter }, { $count: 'count' }],
    });

    return result.documents?.[0]?.count || 0;
  }
}
