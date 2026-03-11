import { Schema, model, Types } from 'mongoose';

export interface IAuditLog {
  orgId: Types.ObjectId;
  actorId?: Types.ObjectId;
  actorName: string;
  action: string;
  targetType: 'device' | 'user' | 'assignment' | 'org';
  targetId: Types.ObjectId;
  details?: any;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  actorId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  actorName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  targetType: {
    type: String,
    enum: ['device', 'user', 'assignment', 'org'],
    required: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  details: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
