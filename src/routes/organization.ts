import { Router, Request, Response } from 'express';
import { Organization, User, Device, Assignment, AuditLog } from '../models';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET / - Get organization details with stats
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;

    // Get organization details
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get organization stats
    const [totalMembers, activeDevices, pendingAssignments] = await Promise.all([
      User.countDocuments({ orgId, isActive: true }),
      Device.countDocuments({ orgId, status: { $in: ['assigned', 'available'] } }),
      Assignment.countDocuments({ orgId, status: 'pending_admin' })
    ]);

    return res.json({
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        description: organization.description,
        website: organization.website,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        city: organization.city,
        country: organization.country,
        timezone: organization.timezone,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      },
      stats: {
        totalMembers,
        activeDevices,
        pendingAssignments
      }
    });
  } catch (error) {
    console.error('Get organization error:', error);
    return res.status(500).json({ error: 'Failed to fetch organization details' });
  }
});

// PUT / - Update organization settings
router.put('/', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;
    const {
      name,
      description,
      website,
      email,
      phone,
      address,
      city,
      country,
      timezone
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    // Find and update organization
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Store old values for audit log
    const oldValues = {
      name: organization.name,
      description: organization.description,
      website: organization.website,
      email: organization.email,
      phone: organization.phone,
      address: organization.address,
      city: organization.city,
      country: organization.country,
      timezone: organization.timezone
    };

    // Update organization
    organization.name = name;
    organization.description = description || '';
    organization.website = website || '';
    organization.email = email || '';
    organization.phone = phone || '';
    organization.address = address || '';
    organization.city = city || '';
    organization.country = country || '';
    organization.timezone = timezone || 'UTC';

    await organization.save();

    // Create audit log
    await AuditLog.create({
      orgId,
      actorId: userId,
      actorName: req.user!.name,
      action: 'ORGANIZATION_UPDATED',
      targetType: 'org',
      targetId: orgId,
      details: {
        oldValues,
        newValues: {
          name,
          description,
          website,
          email,
          phone,
          address,
          city,
          country,
          timezone
        }
      }
    });

    return res.json({
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        description: organization.description,
        website: organization.website,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        city: organization.city,
        country: organization.country,
        timezone: organization.timezone,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      }
    });
  } catch (error) {
    console.error('Update organization error:', error);
    return res.status(500).json({ error: 'Failed to update organization' });
  }
});

// POST /logo - Upload organization logo
router.post('/logo', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;
    const { logoData } = req.body; // Base64 encoded image data

    if (!logoData) {
      return res.status(400).json({ error: 'Logo data is required' });
    }

    // In a real implementation, you would:
    // 1. Validate the image format and size
    // 2. Upload to a cloud storage service (AWS S3, Cloudinary, etc.)
    // 3. Store the URL in the database
    
    // For now, we'll just store a placeholder URL
    const logoUrl = `data:image/png;base64,${logoData}`;

    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const oldLogo = organization.logo;
    organization.logo = logoUrl;
    await organization.save();

    // Create audit log
    await AuditLog.create({
      orgId,
      actorId: userId,
      actorName: req.user!.name,
      action: 'ORGANIZATION_LOGO_UPDATED',
      targetType: 'org',
      targetId: orgId,
      details: {
        oldLogo,
        newLogo: logoUrl
      }
    });

    return res.json({
      logoUrl
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    return res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// DELETE /logo - Remove organization logo
router.delete('/logo', requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;

    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const oldLogo = organization.logo;
    organization.logo = undefined;
    await organization.save();

    // Create audit log
    await AuditLog.create({
      orgId,
      actorId: userId,
      actorName: req.user!.name,
      action: 'ORGANIZATION_LOGO_REMOVED',
      targetType: 'org',
      targetId: orgId,
      details: {
        oldLogo
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Remove logo error:', error);
    return res.status(500).json({ error: 'Failed to remove logo' });
  }
});

export default router;