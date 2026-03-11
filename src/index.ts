import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './lib/db';
import authRouter from './routes/auth';
import devicesRouter from './routes/devices';
import portalRouter from './routes/portal';
import assignmentsRouter from './routes/assignments';
import membersRouter from './routes/members';
import dashboardRouter from './routes/dashboard';
import auditRouter from './routes/audit';
import organizationRouter from './routes/organization';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/portal', portalRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/members', membersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/audit', auditRouter);
app.use('/api/organization', organizationRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
