import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDailyPostStats extends Document {
  postId: Types.ObjectId;
  date: Date;
  views: number;
  shares: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyPostStatsSchema = new Schema<IDailyPostStats>(
  {
    postId: { type: Schema.Types.ObjectId, required: true, ref: 'Post', index: true },
    date: { type: Date, required: true },
    views: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

DailyPostStatsSchema.index({ postId: 1, date: 1 }, { unique: true });
DailyPostStatsSchema.index({ date: 1 });

export const DailyPostStats = mongoose.model<IDailyPostStats>('DailyPostStats', DailyPostStatsSchema);
