import { Router, Request, Response } from 'express';
import { Device, User, Assignment, AuditLog } from '../models';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /stats - Dashboard statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;

    const [
      devicesByStatus,
      totalActiveMembers,
      activeAssignmentsCount,
      pendingAssignmentsCount,
      recentAuditLogs
    ] = await Promise.all([
      // Device counts by status
      Device.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      // Total active members
      User.countDocuments({ orgId, isActive: true }),
      
      // Active assignments count
      Assignment.countDocuments({ orgId, isActive: true }),
      
      // Pending assignments count
      Assignment.countDocuments({ orgId, status: 'pending_admin' }),
      
      // Recent audit logs
      AuditLog.find({ orgId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('actorId', 'name')
    ]);

    // Transform device counts into object
    const deviceCounts: Record<string, number> = {
      available: 0,
      assigned: 0,
      maintenance: 0,
      retired: 0
    };
    
    devicesByStatus.forEach((item: any) => {
      deviceCounts[item._id] = item.count;
    });

    return res.json({
      devices: deviceCounts,
      totalDevices: Object.values(deviceCounts).reduce((sum, count) => sum + count, 0),
      totalActiveMembers,
      activeAssignmentsCount,
      pendingAssignmentsCount,
      recentAuditLogs
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

export default router;
