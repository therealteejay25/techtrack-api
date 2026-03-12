# Backend Deployment Guide

## Quick Fix for Current Issue

Your frontend is deployed but the backend isn't. Here are your deployment options:

## Option 1: Railway (Recommended for Node.js APIs)

1. **Sign up at [Railway.app](https://railway.app)**
2. **Connect your GitHub repository**
3. **Deploy the backend**:
   - Select the `techtrack-api` folder as the root
   - Railway will automatically detect the Node.js project
   - Set environment variables in Railway dashboard:
     ```
     MONGODB_URI=mongodb+srv://therealteejay25_db_user:fuxN4DVMHfgZ1dvG@sonix.xfhwgxn.mongodb.net/techtrack
     JWT_SECRET=b95081b843e91d9e4ce99afb1dd3d8ffd224c1b1f2747f1d78eeb0584ec6bf35
     FRONTEND_URL=https://techtrack01.vercel.app
     RESEND_API_KEY=your_actual_resend_api_key
     HTTPS=true
     NODE_ENV=production
     ```
4. **Get your Railway URL** (e.g., `https://your-app-name.up.railway.app`)
5. **Update frontend environment** (see below)

## Option 2: Vercel

1. **Deploy to Vercel**:
   ```bash
   cd techtrack-api
   vercel --prod
   ```
2. **Set environment variables** in Vercel dashboard
3. **Get your Vercel API URL** (e.g., `https://techtrack-api.vercel.app`)
4. **Update frontend environment** (see below)

## Option 3: Render

1. **Sign up at [Render.com](https://render.com)**
2. **Create a new Web Service**
3. **Connect your repository**
4. **Configure**:
   - Root Directory: `techtrack-api`
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start`
5. **Set environment variables**
6. **Get your Render URL**

## After Backend Deployment

Once you have your backend URL (e.g., `https://your-backend.railway.app`), update the frontend:

### Update Frontend Environment

```bash
# In techtrack/.env.local
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
```

### Redeploy Frontend

```bash
cd techtrack
vercel --prod
```

## Testing the Fix

1. **Check backend health**: Visit `https://your-backend-url.com/health`
2. **Test authentication**: Try logging in at `https://techtrack01.vercel.app/login`
3. **Check browser console** for any remaining CORS or cookie errors

## Environment Variables Needed

### Backend (.env or deployment platform)
```env
MONGODB_URI=mongodb+srv://therealteejay25_db_user:fuxN4DVMHfgZ1dvG@sonix.xfhwgxn.mongodb.net/techtrack
JWT_SECRET=b95081b843e91d9e4ce99afb1dd3d8ffd224c1b1f2747f1d78eeb0584ec6bf35
FRONTEND_URL=https://techtrack01.vercel.app
RESEND_API_KEY=your_actual_resend_api_key
HTTPS=true
NODE_ENV=production
PORT=5000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
```

## Quick Test (Local Development)

If you want to test locally first:

1. **Run backend locally**:
   ```bash
   cd techtrack-api
   pnpm dev
   ```

2. **Update frontend to use local backend**:
   ```bash
   # In techtrack/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

3. **Run frontend**:
   ```bash
   cd techtrack
   pnpm dev
   ```

This should work locally, then you can deploy both to production.