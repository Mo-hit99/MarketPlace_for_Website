# Deployment Guide

This guide covers deploying the SaaS Marketplace application with the backend on Render and frontend on Vercel.

## Architecture Overview

- **Backend**: FastAPI application deployed on Render
- **Frontend**: React/Vite application deployed on Vercel
- **Database**: PostgreSQL database on Render

## Backend Deployment on Render

### Prerequisites

1. Create a [Render account](https://render.com)
2. Connect your GitHub repository to Render

### Step 1: Create PostgreSQL Database

1. Go to Render Dashboard → New → PostgreSQL
2. Configure database:
   - **Name**: `marketplace-db`
   - **Database**: `marketplace_db`
   - **User**: `marketplace_user`
   - **Region**: Choose closest to your users
   - **Plan**: Free tier for development, paid for production

3. After creation, note the **Internal Database URL** and **External Database URL**

### Step 2: Deploy Backend Service

1. Go to Render Dashboard → New → Web Service
2. Connect your repository
3. Configure service:
   - **Name**: `saas-marketplace-backend`
   - **Environment**: `Python 3`
   - **Runtime**: `Python 3.11.9` (important for compatibility)
   - **Region**: Same as database
   - **Branch**: `main` (or your deployment branch)
   - **Root Directory**: `backend` (since backend is in a subdirectory)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Important**: Make sure to set the Python runtime to 3.11.9 in the service settings to avoid SQLAlchemy compatibility issues with Python 3.13.

#### Manual Python Version Configuration (if needed):
If Render still uses Python 3.13, manually set the Python version:
1. Go to your service → Settings → Environment
2. Add environment variable: `PYTHON_VERSION` = `3.11.9`
3. Or in Advanced settings, set Runtime to `python-3.11.9`

### Step 3: Configure Environment Variables

In your Render service settings, add these environment variables:

```bash
# Database (use Internal Database URL from Step 1)
# Note: The app automatically converts postgresql:// to postgresql+psycopg:// for psycopg3 compatibility
DATABASE_URL=postgresql://username:password@hostname:port/database_name

# Security (generate a strong secret key)
SECRET_KEY=your_super_secret_key_change_this_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Optional: Deployment providers
VERCEL_TOKEN=your_vercel_token
RENDER_API_KEY=your_render_api_key
```

### Step 4: Database Migration

After deployment, run database migrations:

1. Go to your service → Shell
2. Run migration commands:
```bash
alembic upgrade head
```

## Frontend Deployment on Vercel

### Prerequisites

1. Create a [Vercel account](https://vercel.com)
2. Install Vercel CLI (optional): `npm i -g vercel`

### Step 1: Configure Environment Variables

Create/update `frontend/.env.production`:

```bash
VITE_API_BASE_URL=https://your-backend-service.onrender.com
```

### Step 2: Deploy via Vercel Dashboard

1. Go to Vercel Dashboard → New Project
2. Import your repository
3. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3: Set Environment Variables

In Vercel project settings → Environment Variables, add:

**Variable Name**: `VITE_API_BASE_URL`  
**Value**: `https://your-backend-service.onrender.com`  
**Environment**: All (Production, Preview, Development)

**Important**: Replace `your-backend-service` with your actual Render service name.

### Step 4: Deploy

1. Click "Deploy"
2. Vercel will automatically build and deploy your frontend

### Alternative: Deploy via CLI

```bash
cd frontend
vercel --prod
```

## Post-Deployment Configuration

### 1. Update CORS Settings

Update your backend CORS configuration in `backend/app/main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.vercel.app",
        "http://localhost:3000",  # Keep for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Update Frontend API Base URL

Ensure your frontend `.env` files point to the correct backend URL:

```bash
# frontend/.env.production
VITE_API_BASE_URL=https://your-backend-service.onrender.com

# frontend/.env.development
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Test the Deployment

1. Visit your Vercel frontend URL
2. Test user registration/login
3. Test app creation and deployment features
4. Verify payment integration (if configured)

## Monitoring and Maintenance

### Backend (Render)

- Monitor logs in Render Dashboard → Service → Logs
- Set up health checks: `/health` endpoint
- Configure auto-deploy on git push

### Frontend (Vercel)

- Monitor deployments in Vercel Dashboard
- Set up preview deployments for branches
- Configure custom domains if needed

### Database

- Monitor database performance in Render Dashboard
- Set up automated backups
- Consider upgrading to paid plan for production

## Troubleshooting

### Common Issues

1. **CORS Errors**: Update CORS origins in backend
2. **Database Connection**: Check DATABASE_URL format
3. **Build Failures**: Verify Node.js/Python versions
4. **Environment Variables**: Ensure all required vars are set
5. **Pillow/PIL Issues**: Use Python 3.11.9 (specified in runtime.txt)
6. **Package Compatibility**: Updated requirements.txt for Python 3.11+ compatibility
7. **psycopg2 Issues**: Switched to psycopg3 for better Python 3.13 support
8. **pkg_resources Missing**: Added setuptools for Python 3.13 compatibility
9. **Vercel Environment Variables**: Set VITE_API_BASE_URL in Vercel dashboard, not as secrets

### Useful Commands

```bash
# Check backend logs
render logs --service your-service-name

# Redeploy frontend
vercel --prod

# Database migration (from Render shell)
alembic upgrade head
```

## Security Considerations

1. Use strong SECRET_KEY in production
2. Enable HTTPS only
3. Set secure environment variables
4. Regular security updates
5. Monitor for vulnerabilities

## Cost Optimization

- **Render**: Free tier has limitations, upgrade for production
- **Vercel**: Generous free tier, pay for usage
- **Database**: Start with free tier, scale as needed

Your application should now be successfully deployed with backend on Render and frontend on Vercel!