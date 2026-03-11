import { Router, Request, Response } from 'express';
import { AuditLog } from '../models';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin', 'super_admin'));

// GET / - List audit logs with pagination and filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { action, targetType, actorId, page = '1', limit = '50' } = req.query;
    const orgId = req.user!.orgId;

    const query: any = { orgId };

    if (action) {
      query.action = action;
    }

    if (targetType) {
      query.targetType = targetType;
    }

    if (actorId) {
      query.actorId = actorId;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('actorId', 'name email')
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    const pages = Math.ceil(total / limitNum);

    return res.json({
      logs,
      total,
      page: pageNum,
      pages
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
