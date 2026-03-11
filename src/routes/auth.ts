import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { Organization, User } from '../models';
import { signToken, setAuthCookie, clearAuthCookie } from '../lib/auth';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// POST /register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { orgName, name, email, password } = req.body;

    // Validate required fields
    if (!orgName || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if email already exists globally
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate slug from orgName
    const baseSlug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const slug = `${baseSlug}-${nanoid(4)}`;

    // Create Organization
    const org = await Organization.create({
      name: orgName,
      slug
    });

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create User with super_admin role
    const user = await User.create({
      orgId: org._id,
      name,
      email,
      passwordHash,
      role: 'super_admin',
      isActive: true
    });

    // Sign JWT and set cookie
    const token = signToken({
      userId: user._id.toString(),
      orgId: org._id.toString(),
      role: user.role,
      name: name,
      email: user.email
    });
    setAuthCookie(res, token);

    // Return user and org info
    return res.status(201).json({
      user: {
        id: user._id,
        name: name,
        email: user.email,
        role: user.role
      },
      org: {
        id: org._id,
        name: org.name,
        slug: org.slug
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find active user by email
    const user = await User.findOne({ email, isActive: true }).populate('orgId');
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const org = user.orgId as any;

    // Sign JWT and set cookie
    const token = signToken({
      userId: user._id.toString(),
      orgId: org._id.toString(),
      role: user.role,
      name: user.name || user.email,
      email: user.email
    });
    setAuthCookie(res, token);

    // Return user and org info
    return res.json({
      user: {
        id: user._id,
        name: user.name || user.email,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone
      },
      org: {
        id: org._id,
        name: org.name,
        slug: org.slug,
        logo: org.logo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /logout
router.post('/logout', (req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.json({ success: true });
});

// GET /me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId).populate('orgId').select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const org = user.orgId as any;

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
      org: {
        id: org._id,
        name: org.name,
        slug: org.slug,
        logo: org.logo
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// POST /accept-invite
router.post('/accept-invite', async (req: Request, res: Response) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ error: 'Token, name, and password are required' });
    }

    // Find user with valid invite token
    const user = await User.findOne({
      inviteToken: token,
      inviteExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired invite token' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user
    user.name = name;
    user.passwordHash = passwordHash;
    user.isActive = true;
    user.inviteToken = undefined;
    user.inviteExpiry = undefined;
    await user.save();

    // Sign JWT and set cookie
    const jwtToken = signToken({
      userId: user._id.toString(),
      orgId: user.orgId.toString(),
      role: user.role,
      name: name,
      email: user.email
    });
    setAuthCookie(res, jwtToken);

    // Return user info
    return res.json({
      user: {
        id: user._id,
        name: name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    return res.status(500).json({ error: 'Failed to accept invite' });
  }
});

export default router;
