import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { User, Assignment, AuditLog, OTP } from '../models';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { sendInviteEmail } from '../lib/email';

const router = Router();

// All routes require authentication
router.use(authenticate);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// GET / - List all users in organization
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const orgId = req.user!.orgId;

    const query: any = { orgId };
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    // Transform _id to id for frontend consistency
    const transformedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
      isActive: user.isActive
    }));

    return res.json({ users: transformedUsers });
  } catch (error) {
    console.error('List members error:', error);
    return res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// POST /invite - Invite new user
router.post('/invite', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or staff' });
    }

    // Check if email already exists in org
    const existing = await User.findOne({ orgId, email });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists in your organization' });
    }

    // Generate invite token
    const inviteToken = nanoid(32);
    const inviteExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Create user
    const user = await User.create({
      orgId,
      email,
      role,
      name: '', // Will be set when they accept invite
      passwordHash: '', // Will be set when they accept invite
      isActive: false,
      inviteToken,
      inviteExpiry
    });

    // Audit log
    await AuditLog.create({
      orgId,
      actorId: userId,
      actorName: req.user!.name,
      action: 'USER_INVITED',
      targetType: 'user',
      targetId: user._id,
      details: { email, role }
    });

    const inviteLink = `${FRONTEND_URL}/accept-invite?token=${inviteToken}`;

    // Send email invitation
    const orgData = await User.findById(userId).populate('orgId');
    const orgName = (orgData?.orgId as any)?.name || 'Your Organization';
    
    await sendInviteEmail(email, inviteLink, orgName, role);

    return res.status(201).json({
      inviteLink,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        inviteExpiry: user.inviteExpiry
      }
    });
  } catch (error) {
    console.error('Invite member error:', error);
    return res.status(500).json({ error: 'Failed to invite member' });
  }
});

// POST /:id/generate-otp - Generate OTP for device assignment
router.post('/:id/generate-otp', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // This is the user ID
    const orgId = req.user!.orgId;
    const adminId = req.user!.userId;

    // Find target user in same org
    const targetUser = await User.findOne({ _id: id, orgId });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Invalidate existing unused OTPs for this user
    await OTP.updateMany(
      { targetUserId: id, used: false },
      { used: true, usedAt: new Date() }
    );

    // Generate 6-digit OTP
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(plainOtp, 10);

    // Create OTP document (no deviceId needed)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const otp = await OTP.create({
      orgId,
      deviceId: null, // No device yet
      targetUserId: id,
      createdBy: adminId,
      otpHash,
      expiresAt
    });

    // Audit log
    await AuditLog.create({
      orgId,
      actorId: adminId,
      actorName: req.user!.name,
      action: 'OTP_GENERATED',
      targetType: 'user',
      targetId: targetUser._id,
      details: {
        targetUserId: id,
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

// GET /:id - Get user details with active assignments
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const user = await User.findOne({ _id: id, orgId }).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get active assignments
    const assignments = await Assignment.find({
      userId: id,
      orgId,
      isActive: true
    })
      .populate('deviceId', 'assetTag brand model serialNumber status')
      .populate('assignedBy', 'name');

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        isActive: user.isActive
      },
      assignments
    });
  } catch (error) {
    console.error('Get member error:', error);
    return res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// PATCH /:id/role - Change user role
router.patch('/:id/role', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;

    if (!role || !['super_admin', 'admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Cannot change self
    if (id === userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const user = await User.findOne({ _id: id, orgId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot change another super_admin
    if (user.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot change role of another super admin' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Audit log
    await AuditLog.create({
      orgId,
      actorId: userId,
      actorName: req.user!.name,
      action: 'USER_ROLE_CHANGED',
      targetType: 'user',
      targetId: user._id,
      details: { oldRole, newRole: role, email: user.email }
    });

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Change role error:', error);
    return res.status(500).json({ error: 'Failed to change role' });
  }
});

// DELETE /:id - Deactivate user
router.delete('/:id', requireRole('super_admin', 'admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;

    const user = await User.findOne({ _id: id, orgId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot deactivate super_admin
    if (user.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot deactivate a super admin' });
    }

    user.isActive = false;
    await user.save();

    // Audit log
    await AuditLog.create({
      orgId,
      actorId: userId,
      actorName: req.user!.name,
      action: 'USER_DEACTIVATED',
      targetType: 'user',
      targetId: user._id,
      details: { email: user.email, role: user.role }
    });

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Deactivate member error:', error);
    return res.status(500).json({ error: 'Failed to deactivate member' });
  }
});

export default router;
