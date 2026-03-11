import { Router, Request, Response } from 'express';
import { Assignment, Device, AuditLog } from '../models';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET / - List assignments with pagination and filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { isActive, status, page = '1', limit = '20' } = req.query;
    const orgId = req.user!.orgId;

    const query: any = { orgId };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (status) {
      query.status = status;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('deviceId', 'assetTag brand model')
        .populate('userId', 'name email department')
        .populate('assignedBy', 'name')
        .lean(),
      Assignment.countDocuments(query)
    ]);

    const pages = Math.ceil(total / limitNum);

    return res.json({
      assignments,
      total,
      page: pageNum,
      pages
    });
  } catch (error) {
    console.error('List assignments error:', error);
    return res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /pending - Get assignments pending admin confirmation
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;

    const assignments = await Assignment.find({
      orgId,
      status: 'pending_admin'
    })
      .sort({ createdAt: -1 })
      .populate('deviceId', 'assetTag brand model serialNumber processor ram storage os')
      .populate('userId', 'name email department phone')
      .populate('assignedBy', 'name');

    return res.json({ assignments });
  } catch (error) {
    console.error('Get pending assignments error:', error);
    return res.status(500).json({ error: 'Failed to fetch pending assignments' });
  }
});

// GET /:id - Get assignment details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const assignment = await Assignment.findOne({ _id: id, orgId })
      .populate('deviceId')
      .populate('userId')
      .populate('assignedBy', 'name email');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    return res.json({ assignment });
  } catch (error) {
    console.error('Get assignment error:', error);
    return res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// PATCH /:id/confirm - Admin confirms assignment
router.patch('/:id/confirm', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accessories, conditionAtAssignment, adminNotes } = req.body;
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;

    // Find assignment
    const assignment = await Assignment.findOne({ _id: id, orgId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check status
    if (assignment.status !== 'pending_admin') {
      return res.status(400).json({ error: 'Assignment is not pending confirmation' });
    }

    // Update assignment
    assignment.status = 'confirmed';
    assignment.assignedAt = new Date();
    assignment.assignedBy = userId as any;
    if (accessories) assignment.accessories = accessories;
    if (conditionAtAssignment) assignment.conditionAtAssignment = conditionAtAssignment;
    if (adminNotes) assignment.adminNotes = adminNotes;
    await assignment.save();

    // Update device status
    await Device.findByIdAndUpdate(assignment.deviceId, { status: 'assigned' });

    // Get device info for audit log
    const device = await Device.findById(assignment.deviceId);

    // Audit log
    await AuditLog.create({
      orgId,
      actorId: userId,
      actorName: req.user!.name,
      action: 'DEVICE_ASSIGNED',
      targetType: 'assignment',
      targetId: assignment._id,
      details: {
        deviceId: assignment.deviceId,
        userId: assignment.userId,
        assetTag: device?.assetTag,
        accessories
      }
    });

    // Populate for response
    await assignment.populate([
      { path: 'deviceId', select: 'assetTag brand model' },
      { path: 'userId', select: 'name email department' },
      { path: 'assignedBy', select: 'name' }
    ]);

    return res.json({ assignment });
  } catch (error) {
    console.error('Confirm assignment error:', error);
    return res.status(500).json({ error: 'Failed to confirm assignment' });
  }
});

// POST /:id/return - Return device from assignment
router.post('/:id/return', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;

    // Find assignment
    const assignment = await Assignment.findOne({ _id: id, orgId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if active
    if (!assignment.isActive) {
      return res.status(400).json({ error: 'Assignment is not active' });
    }

    // Update assignment
    assignment.returnedAt = new Date();
    assignment.isActive = false;
    assignment.status = 'returned';
    if (notes) assignment.adminNotes = notes;
    await assignment.save();

    // Update device status
    await Device.findByIdAndUpdate(assignment.deviceId, { status: 'available' });

    // Get device info for audit log
    const device = await Device.findById(assignment.deviceId);

    // Audit log
    await AuditLog.create({
      orgId,
      actorId: userId,
      actorName: req.user!.name,
      action: 'DEVICE_RETURNED',
      targetType: 'assignment',
      targetId: assignment._id,
      details: {
        deviceId: assignment.deviceId,
        userId: assignment.userId,
        assetTag: device?.assetTag,
        notes
      }
    });

    // Populate for response
    await assignment.populate([
      { path: 'deviceId', select: 'assetTag brand model' },
      { path: 'userId', select: 'name email department' },
      { path: 'assignedBy', select: 'name' }
    ]);

    return res.json({ assignment });
  } catch (error) {
    console.error('Return assignment error:', error);
    return res.status(500).json({ error: 'Failed to return device' });
  }
});

export default router;
