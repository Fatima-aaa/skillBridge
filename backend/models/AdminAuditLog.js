const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin ID is required'],
      immutable: true,
    },
    actionType: {
      type: String,
      enum: [
        'user_suspended',
        'user_reinstated',
        'mentorship_paused',
        'mentorship_completed',
        'admin_login',
      ],
      required: [true, 'Action type is required'],
      immutable: true,
    },
    targetType: {
      type: String,
      enum: ['user', 'mentorship', 'system'],
      required: [true, 'Target type is required'],
      immutable: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
      immutable: true,
    },
    reason: {
      type: String,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
      required: [true, 'Reason is required for admin actions'],
      immutable: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      immutable: true,
    },
    ipAddress: {
      type: String,
      immutable: true,
    },
    userAgent: {
      type: String,
      immutable: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for querying audit logs
adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });
adminAuditLogSchema.index({ actionType: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
adminAuditLogSchema.index({ createdAt: -1 });

// Prevent updates to audit logs
adminAuditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs are immutable and cannot be updated');
});

adminAuditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs are immutable and cannot be updated');
});

adminAuditLogSchema.pre('updateMany', function () {
  throw new Error('Audit logs are immutable and cannot be updated');
});

// Prevent deletions of audit logs
adminAuditLogSchema.pre('findOneAndDelete', function () {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

adminAuditLogSchema.pre('deleteOne', function () {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

adminAuditLogSchema.pre('deleteMany', function () {
  throw new Error('Audit logs are immutable and cannot be deleted');
});

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
