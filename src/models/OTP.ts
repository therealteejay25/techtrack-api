import { Schema, model, Types } from 'mongoose';

export interface IOTP {
  orgId: Types.ObjectId;
  deviceId?: Types.ObjectId;
  targetUserId: Types.ObjectId;
  createdBy: Types.ObjectId;
  otpHash: string;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
  assignmentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOTP>({
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device'
  },
  targetUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  otpHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date
  },
  assignmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Assignment'
  }
}, {
  timestamps: true
});

// Index for efficient queries
otpSchema.index({ deviceId: 1, used: 1, expiresAt: 1 });

export const OTP = model<IOTP>('OTP', otpSchema);
