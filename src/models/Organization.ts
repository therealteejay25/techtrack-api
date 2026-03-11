import { Schema, model, Types } from 'mongoose';

export interface IOrganization {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>({
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  logo: {
    type: String
  },
  description: {
    type: String
  },
  website: {
    type: String
  },
  email: {
    type: String
  },
  phone: {
    type: String
  },
  address: {
    type: String
  },
  city: {
    type: String
  },
  country: {
    type: String
  },
  timezone: {
    type: String,
    default: 'UTC'
  }
}, {
  timestamps: true
});

export const Organization = model<IOrganization>('Organization', organizationSchema);
