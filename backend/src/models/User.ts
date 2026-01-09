import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  auth0Id: string;
  email: string;
  name: string;
  picture?: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    auth0Id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: '' },
    picture: { type: String },
    isAdmin: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    _id: false,
  }
);

UserSchema.index({ auth0Id: 1 });
UserSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
