import { Schema, model, Types } from 'mongoose';

export interface IUser {
  orgId: Types.ObjectId;
  name?: string;
  email: string;
  passwordHash?: string;
  role: 'super_admin' | 'admin' | 'staff';
  department?: string;
  phone?: string;
  isActive: boolean;
  inviteToken?: string;
  inviteExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  name: {
    type: String
  },
  email: {
    type: String,
    required: true
  },
  passwordHash: {
    type: String
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'staff'],
    default: 'staff'
  },
  department: {
    type: String
  },
  phone: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  inviteToken: {
    type: String
  },
  inviteExpiry: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound unique index
userSchema.index({ orgId: 1, email: 1 }, { unique: true });

export const User = model<IUser>('User', userSchema);
