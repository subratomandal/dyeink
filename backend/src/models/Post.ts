import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  userId: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  published: boolean;
  publishedAt: Date | null;
  views: number;
  shares: number;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    userId: { type: String, required: true, index: true, ref: 'User' },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    content: { type: String, default: '' },
    excerpt: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    views: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

PostSchema.index({ userId: 1, slug: 1 }, { unique: true });
PostSchema.index({ slug: 1 });
PostSchema.index({ published: 1 });
PostSchema.index({ userId: 1, published: 1 });

export const Post = mongoose.model<IPost>('Post', PostSchema);
