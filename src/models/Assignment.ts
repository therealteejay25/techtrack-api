import { Schema, model, Types } from 'mongoose';

export interface IAssignment {
  orgId: Types.ObjectId;
  deviceId: Types.ObjectId;
  userId: Types.ObjectId;
  assignedBy: Types.ObjectId;
  assignedAt: Date;
  returnedAt?: Date;
  isActive: boolean;
  detectedOs?: string;
  detectedOsVersion?: string;
  detectedRam?: string;
  detectedScreenRes?: string;
  detectedHostname?: string;
  otpVerifiedAt?: Date;
  accessories?: string;
  conditionAtAssignment?: string;
  adminNotes?: string;
  status: 'pending_admin' | 'confirmed' | 'returned';
  acknowledgementMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>({
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  returnedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  detectedOs: {
    type: String
  },
  detectedOsVersion: {
    type: String
  },
  detectedRam: {
    type: String
  },
  detectedScreenRes: {
    type: String
  },
  detectedHostname: {
    type: String
  },
  otpVerifiedAt: {
    type: Date
  },
  accessories: {
    type: String
  },
  conditionAtAssignment: {
    type: String
  },
  adminNotes: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending_admin', 'confirmed', 'returned'],
    default: 'pending_admin'
  },
  acknowledgementMethod: {
    type: String,
    default: 'otp_portal'
  }
}, {
  timestamps: true
});

export const Assignment = model<IAssignment>('Assignment', assignmentSchema);
