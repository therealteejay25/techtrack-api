import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { OTP, Device, User, Assignment, AuditLog } from '../models';

const router = Router();

// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 20;

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Rate limiter middleware
function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  let entry = rateLimitMap.get(ip);
  
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW
    };
    rateLimitMap.set(ip, entry);
    return next();
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  
  entry.count++;
  next();
}

// Apply rate limiter to all portal routes
router.use(rateLimiter);

// POST /verify-otp
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;

    // Validate OTP format
    if (!otp || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'OTP must be 6 digits' });
    }

    // Find unused, non-expired OTPs (limit to last 100 for performance)
    const otps = await OTP.find({
      used: false,
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: -1 })
      .limit(100);

    // Try to match OTP
    let matchedOtp = null;
    for (const otpRecord of otps) {
      const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
      if (isMatch) {
        matchedOtp = otpRecord;
        break;
      }
    }

    if (!matchedOtp) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }

    // Populate target user
    const targetUser = await User.findById(matchedOtp.targetUserId).select('name email department');

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      otpId: matchedOtp._id,
      targetUser: {
        name: targetUser.name,
        email: targetUser.email,
        department: targetUser.department
      },
      orgId: matchedOtp.orgId
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST /submit
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const {
      otpId,
      otp,
      // Device info from user input
      brand,
      model,
      serialNumber,
      processor,
      storage,
      // Enhanced system detection
      detectedOs,
      detectedOsVersion,
      detectedRam,
      detectedScreenRes,
      detectedHostname,
      userAgent,
      language,
      languages,
      timezone,
      screenColorDepth,
      screenPixelDepth,
      cookieEnabled,
      onlineStatus,
      hardwareConcurrency,
      maxTouchPoints,
      connectionType,
      connectionDownlink,
      browserName,
      browserVersion,
      devicePixelRatio,
      screenOrientation,
      deviceMemory,
      collectedAt,
      localTime,
      utcOffset
    } = req.body;

    if (!otpId || !otp) {
      return res.status(400).json({ error: 'otpId and otp are required' });
    }

    // Find OTP by ID
    const otpRecord = await OTP.findById(otpId);
    if (!otpRecord) {
      return res.status(404).json({ error: 'OTP not found' });
    }

    // Check if already used
    if (otpRecord.used) {
      return res.status(400).json({ error: 'OTP has already been used' });
    }

    // Check if expired
    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Re-verify OTP hash (security check)
    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    // Get target user
    const targetUser = await User.findById(otpRecord.targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create device with enhanced system info
    const device = await Device.create({
      orgId: otpRecord.orgId,
      assetTag: `TEMP-${Date.now()}`, // Temporary, admin will update
      brand: brand || 'Unknown',
      model: model || 'Unknown',
      serialNumber: serialNumber || `SN-${Date.now()}`,
      processor,
      ram: detectedRam || `${deviceMemory}GB` || '',
      storage,
      os: detectedOs,
      osVersion: detectedOsVersion,
      status: 'assigned', // Will be assigned immediately
      createdBy: otpRecord.createdBy,
      systemInfo: {
        userAgent,
        language,
        languages,
        timezone,
        screenColorDepth,
        screenPixelDepth,
        cookieEnabled,
        onlineStatus,
        hardwareConcurrency,
        maxTouchPoints,
        connectionType,
        connectionDownlink,
        browserName,
        browserVersion,
        devicePixelRatio,
        screenOrientation,
        deviceMemory,
        collectedAt,
        localTime,
        utcOffset,
        detectedScreenRes,
        detectedHostname
      }
    });

    // Create assignment with enhanced detection info
    const assignment = await Assignment.create({
      orgId: otpRecord.orgId,
      deviceId: device._id,
      userId: otpRecord.targetUserId,
      assignedBy: otpRecord.createdBy,
      status: 'pending_admin',
      otpVerifiedAt: new Date(),
      detectedOs,
      detectedOsVersion,
      detectedRam: detectedRam || `${deviceMemory}GB` || '',
      detectedScreenRes,
      detectedHostname,
      isActive: true
    });

    // Mark OTP as used
    otpRecord.used = true;
    otpRecord.usedAt = new Date();
    otpRecord.assignmentId = assignment._id;
    await otpRecord.save();

    // Enhanced audit log with more system info
    await AuditLog.create({
      orgId: otpRecord.orgId,
      actorId: null,
      actorName: targetUser.name,
      action: 'OTP_USED',
      targetType: 'assignment',
      targetId: assignment._id,
      details: {
        deviceId: device._id,
        detectedOs,
        detectedOsVersion,
        detectedRam: detectedRam || `${deviceMemory}GB` || '',
        browserName,
        browserVersion,
        timezone,
        systemInfoCollected: true
      }
    });

    return res.json({
      success: true,
      assignmentId: assignment._id,
      deviceId: device._id
    });
  } catch (error) {
    console.error('Submit portal error:', error);
    return res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

export default router;
