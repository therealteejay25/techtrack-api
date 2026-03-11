import { Schema, model, Types } from 'mongoose';

export interface IDevice {
  orgId: Types.ObjectId;
  assetTag: string;
  brand: string;
  model: string;
  serialNumber: string;
  processor?: string;
  ram?: string;
  storage?: string;
  os?: string;
  osVersion?: string;
  macAddress?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  warrantyExpiry?: Date;
  condition: 'new' | 'good' | 'fair' | 'poor';
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  notes?: string;
  createdBy: Types.ObjectId;
  
  // Enhanced system information
  systemInfo?: {
    userAgent?: string;
    language?: string;
    languages?: string;
    timezone?: string;
    screenColorDepth?: number;
    screenPixelDepth?: number;
    cookieEnabled?: boolean;
    onlineStatus?: boolean;
    hardwareConcurrency?: number;
    maxTouchPoints?: number;
    connectionType?: string;
    connectionDownlink?: number;
    browserName?: string;
    browserVersion?: string;
    devicePixelRatio?: number;
    screenOrientation?: string;
    deviceMemory?: number;
    collectedAt?: string;
    localTime?: string;
    utcOffset?: number;
    detectedScreenRes?: string;
    detectedHostname?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>({
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  assetTag: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  serialNumber: {
    type: String,
    required: true
  },
  processor: {
    type: String
  },
  ram: {
    type: String
  },
  storage: {
    type: String
  },
  os: {
    type: String
  },
  osVersion: {
    type: String
  },
  macAddress: {
    type: String
  },
  purchaseDate: {
    type: Date
  },
  purchasePrice: {
    type: Number
  },
  warrantyExpiry: {
    type: Date
  },
  condition: {
    type: String,
    enum: ['new', 'good', 'fair', 'poor'],
    default: 'good'
  },
  status: {
    type: String,
    enum: ['available', 'assigned', 'maintenance', 'retired'],
    default: 'available'
  },
  notes: {
    type: String
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  systemInfo: {
    userAgent: String,
    language: String,
    languages: String,
    timezone: String,
    screenColorDepth: Number,
    screenPixelDepth: Number,
    cookieEnabled: Boolean,
    onlineStatus: Boolean,
    hardwareConcurrency: Number,
    maxTouchPoints: Number,
    connectionType: String,
    connectionDownlink: Number,
    browserName: String,
    browserVersion: String,
    devicePixelRatio: Number,
    screenOrientation: String,
    deviceMemory: Number,
    collectedAt: String,
    localTime: String,
    utcOffset: Number,
    detectedScreenRes: String,
    detectedHostname: String
  }
}, {
  timestamps: true
});

// Unique index
deviceSchema.index({ orgId: 1, assetTag: 1 }, { unique: true });

export const Device = model<IDevice>('Device', deviceSchema);
