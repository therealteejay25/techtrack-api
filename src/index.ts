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

// Enhanced CORS configuration for HTTPS
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    console.log('CORS Origin:', origin); // Debug logging
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow the configured frontend URL
    if (origin === FRONTEND_URL) {
      return callback(null, true);
    }
    
    // In development, allow localhost with any port
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Allow your production domains
    const allowedOrigins = [
      FRONTEND_URL,
      'https://techtrack01.vercel.app', // Your Vercel domain
      'https://techtrack-api.onrender.com', // Your Render backend domain
      'http://localhost:3000',
      'https://localhost:3000'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin); // Debug logging
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};

// Middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // Increased limit for logo uploads

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
  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = process.env.HTTPS === 'true' || isProduction;
  
  res.json({ 
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    https: isHttps,
    frontendUrl: FRONTEND_URL,
    timestamp: new Date().toISOString()
  });
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
