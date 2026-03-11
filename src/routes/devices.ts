import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Device, Assignment, User, OTP, AuditLog } from '../models';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET / - List devices with pagination and filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query;
    const orgId = req.user!.orgId;

    const query: any = { orgId };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { assetTag: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [devices, total] = await Promise.all([
      Device.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Device.countDocuments(query)
    ]);

    const pages = Math.ceil(total / limitNum);

    return res.json({
      devices,
      total,
      page: pageNum,
      pages
    });
  } catch (error) {
    console.error('List devices error:', error);
    return res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// POST / - Create device
router.post('/', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { assetTag, brand, model, serialNumber, ...rest } = req.body;
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;

    // Validate required fields
    if (!assetTag || !brand || !model || !serialNumber) {
      return res.status(400).json({ error: 'assetTag, brand, model, and serialNumber are required' });
    }

    // Check assetTag unique within org
    const existing = await Device.findOne({ orgId, assetTag });
    if (existing) {
      return res.status(400).json({ error: 'Asset tag already exists in your organization' });
    }

    // Create device
    const device = await Device.create({
      orgId,
      assetTag,
      brand,
      model,
      serialNumber,
      createdBy: userId,
      ...rest
    });

    // Audit log
    await AuditLog.create({
      orgId,
      actorId: userId,
      actorName: req.user!.name,
      action: 'DEVICE_CREATED',
      targetType: 'device',
      targetId: device._id,
      details: { assetTag, brand, model }
    });

    return res.status(201).json({ device });
  } catch (error) {
    console.error('Create device error:', error);
    return res.status(500).json({ error: 'Failed to create device' });
  }
});

// GET /:id - Get device details with current assignment
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const device = await Device.findOne({ _id: id, orgId })
      .populate('createdBy', 'name');

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Find current assignment
    const currentAssignment = await Assignment.findOne({
      deviceId: id,
      orgId,
      isActive: true,
      status: { $in: ['confirmed', 'pending_admin'] }
    })
      .populate('userId', 'name email department')
      .populate('assignedBy', 'name');

    return res.json({
      device,
      currentAssignment
    });
  } catch (error) {
    console.error('Get device error:', error);
    return res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// PATCH /:id - Update device
router.patch('/:id', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;
    const updates = { ...req.body };

    // Cannot change status directly
    delete updates.status;
    delete updates.orgId;
    delete updates.createdBy;

    const device = await Device.findOneAndUpdate(
      { _id: id, orgId },
      updates,
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Audit log
    await AuditLog.create({
      orgId,
      actorId: userId,
      actorName: req.user!.name,
      action: 'DEVICE_UPDATED',
      targetType: 'device',
      targetId: device._id,
      details: updates
    });

    return res.json({ device });
  } catch (error) {
    console.error('Update device error:', error);
    return res.status(500).json({ error: 'Failed to update device' });
  }
});

// DELETE /:id - Retire device
router.delete('/:id', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;

    // Check no active assignment
    const activeAssignment = await Assignment.findOne({
      deviceId: id,
      orgId,
      isActive: true
    });

    if (activeAssignment) {
      return res.status(400).json({ error: 'Cannot retire device with active assignment' });
    }

    // Set status to retired
    const device = await Device.findOneAndUpdate(
      { _id: id, orgId },
      { status: 'retired' },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Audit log
    await AuditLog.create({
      orgId,
      actorId: userId,
      actorName: req.user!.name,
      action: 'DEVICE_RETIRED',
      targetType: 'device',
      targetId: device._id,
      details: { assetTag: device.assetTag }
    });

    return res.json({ device });
  } catch (error) {
    console.error('Delete device error:', error);
    return res.status(500).json({ error: 'Failed to retire device' });
  }
});

// GET /:id/history - Get device assignment history
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    // Verify device exists and belongs to org
    const device = await Device.findOne({ _id: id, orgId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const history = await Assignment.find({ deviceId: id, orgId })
      .sort({ assignedAt: -1 })
      .populate('userId', 'name email department')
      .populate('assignedBy', 'name');

    return res.json({ history });
  } catch (error) {
    console.error('Get device history error:', error);
    return res.status(500).json({ error: 'Failed to fetch device history' });
  }
});

// POST /:id/generate-otp - Generate OTP for device assignment
router.post('/:id/generate-otp', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetUserId } = req.body;
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;

    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }

    // Find device and check status
    const device = await Device.findOne({ _id: id, orgId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (device.status !== 'available') {
      return res.status(400).json({ error: 'Device is not available' });
    }

    // Find target user in same org
    const targetUser = await User.findOne({ _id: targetUserId, orgId });
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Invalidate existing unused OTPs for this device
    await OTP.updateMany(
      { deviceId: id, used: false },
      { used: true, usedAt: new Date() }
    );

    // Generate 6-digit OTP
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(plainOtp, 10);

    // Create OTP document
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const otp = await OTP.create({
      orgId,
      deviceId: id,
      targetUserId,
      createdBy: userId,
      otpHash,
      expiresAt
    });

    // Audit log
    await AuditLog.create({
      orgId,
      actorId: userId,
      actorName: req.user!.name,
      action: 'OTP_GENERATED',
      targetType: 'device',
      targetId: device._id,
      details: {
        targetUserId,
        targetUserName: targetUser.name,
        otpId: otp._id
      }
    });

    return res.json({
      otp: plainOtp,
      expiresAt,
      otpId: otp._id,
      targetUser: {
        name: targetUser.name,
        email: targetUser.email
      }
    });
  } catch (error) {
    console.error('Generate OTP error:', error);
    return res.status(500).json({ error: 'Failed to generate OTP' });
  }
});

export default router;
