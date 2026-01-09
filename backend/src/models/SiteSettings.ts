import mongoose, { Schema, Document } from 'mongoose';

export type DomainStatus = 'pending' | 'verified' | 'active' | 'failed' | null;

export interface ISiteSettings extends Document {
  userId: string;
  siteName: string;
  siteDescription: string;
  customDomain: string | null;
  subdomain: string | null;
  twitterLink: string | null;
  linkedinLink: string | null;
  githubLink: string | null;
  websiteLink: string | null;
  dribbbleLink: string | null;
  huggingfaceLink: string | null;
  leetcodeLink: string | null;
  newsletterEmail: string | null;
  domainStatus: DomainStatus;
  verifyToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    userId: { type: String, required: true, unique: true, index: true, ref: 'User' },
    siteName: { type: String, default: '' },
    siteDescription: { type: String, default: '' },
    customDomain: { type: String, default: null, sparse: true },
    subdomain: { type: String, default: null, unique: true, sparse: true },
    twitterLink: { type: String, default: null },
    linkedinLink: { type: String, default: null },
    githubLink: { type: String, default: null },
    websiteLink: { type: String, default: null },
    dribbbleLink: { type: String, default: null },
    huggingfaceLink: { type: String, default: null },
    leetcodeLink: { type: String, default: null },
    newsletterEmail: { type: String, default: null },
    domainStatus: {
      type: String,
      enum: ['pending', 'verified', 'active', 'failed', null],
      default: null
    },
    verifyToken: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

SiteSettingsSchema.index({ customDomain: 1 }, { sparse: true });
SiteSettingsSchema.index({ subdomain: 1 }, { sparse: true });

export const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
