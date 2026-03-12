# Deployment Instructions

## Backend is Already Deployed on Render
Your backend is running at: https://techtrack-api.onrender.com

## To Update Backend Configuration on Render:

1. **Go to your Render dashboard**
2. **Find your techtrack-api service**
3. **Update Environment Variables**:
   ```
   MONGODB_URI=mongodb+srv://therealteejay25_db_user:fuxN4DVMHfgZ1dvG@sonix.xfhwgxn.mongodb.net/techtrack
   JWT_SECRET=b95081b843e91d9e4ce99afb1dd3d8ffd224c1b1f2747f1d78eeb0584ec6bf35
   FRONTEND_URL=https://techtrack01.vercel.app
   RESEND_API_KEY=your_resend_api_key_here
   HTTPS=true
   NODE_ENV=production
   PORT=5000
   ```
4. **Redeploy** (Render will auto-deploy when you push changes to GitHub)

## Frontend Configuration Updated
Your frontend `.env.local` now points to: `https://techtrack-api.onrender.com/api`

## Next Steps:
1. **Push backend changes** to GitHub (Render will auto-deploy)
2. **Redeploy frontend** on Vercel to pick up the new API URL
3. **Test authentication** at https://techtrack01.vercel.app/login

## Testing:
- Backend health: https://techtrack-api.onrender.com/health ✅ (Working)
- Frontend: https://techtrack01.vercel.app
- Try logging in after redeployment