import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubscriber extends Document {
  email: string;
  blogId: Types.ObjectId;
  active: boolean;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriberSchema = new Schema<ISubscriber>(
  {
    email: { type: String, required: true },
    blogId: { type: Schema.Types.ObjectId, required: true, ref: 'SiteSettings', index: true },
    active: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

SubscriberSchema.index({ blogId: 1, email: 1 }, { unique: true });
SubscriberSchema.index({ email: 1 });

export const Subscriber = mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);
