# SaaS Marketplace Platform

A production-grade SaaS marketplace where developers can upload web applications, automate deployment (Vercel/Render), and users can subscribe and access them securely.

## Architecture

### Backend (FastAPI)
- **MVC Structure**: Clean separation of Models, Views (API), and Controllers (Services)
- **Database**: PostgreSQL with SQLAlchemy ORM and Alembic migrations
- **Authentication**: JWT-based with role-based access control (Admin/Developer/User)
- **Payment Integration**: Razorpay (Test Mode)
- **Deployment Automation**: GitHub Actions workflow generation for Vercel/Render

### Frontend (React + TypeScript + Tailwind CSS)
- **SPA**: React with Vite build tool
- **Routing**: React Router v7
- **State Management**: Context API for authentication
- **UI**: Tailwind CSS with responsive design

## Features

### For Developers
- Upload web applications (ZIP format)
- Automatic framework detection (React/Node/Python)
- Deploy to Vercel or Render with one click
- Monitor deployment status
- View live production URLs

### For Users
- Browse published applications
- Purchase subscriptions via Razorpay
- Secure app access via controlled redirect (no iframes)
- Manage active subscriptions

### For Admins
- Platform-wide app monitoring
- Approve/reject applications
- View analytics dashboard

## Setup Instructions

### Prerequisites
- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend)
- **PostgreSQL** 14+ (database)
- **Git** (version control)

### Quick Start (Development)

1. **Clone the repository:**
```bash
git clone <repository-url>
cd saas-marketplace-platform
```

2. **Set up PostgreSQL database:**
```bash
# Create database
createdb marketplace_db

# Or using PostgreSQL CLI:
psql -U postgres
CREATE DATABASE marketplace_db;
\q
```

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Create and activate virtual environment:**
```bash
# Windows
python -m venv venv_new
venv_new\Scripts\activate

# Linux/Mac
python3 -m venv venv_new
source venv_new/bin/activate
```

3. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables:**
```bash
# Copy example environment file
cp .env.example .env

# Edit .env file with your configurations:
# - Database credentials (PostgreSQL)
# - JWT secret key
# - Razorpay API keys (for payments)
# - Deployment provider tokens (Vercel/Render)
```

**Required .env variables:**
```env
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=marketplace_db

# Security
SECRET_KEY=your_super_secret_key_change_this_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Payment Gateway (Razorpay Test Mode)
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret

# Deployment Providers (Optional for development)
VERCEL_TOKEN=your_vercel_token
RENDER_API_KEY=your_render_api_key
```

5. **Initialize database with migrations:**
```bash
# Run database migrations
alembic upgrade head
```

6. **Start the backend server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at:**
- API: `http://localhost:8000`
- Interactive API docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install Node.js dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

**Frontend will be available at:**
- Application: `http://localhost:5173`

4. **Build for production:**
```bash
npm run build
npm run preview  # Preview production build
```

### Database Setup (Detailed)

1. **Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Windows: Download from https://www.postgresql.org/download/windows/
```

2. **Create database and user:**
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE marketplace_db;
CREATE USER marketplace_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE marketplace_db TO marketplace_user;
\q
```

3. **Update connection string in .env:**
```env
POSTGRES_USER=marketplace_user
POSTGRES_PASSWORD=your_password
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=marketplace_db
```

### Development Workflow

1. **Start backend (Terminal 1):**
```bash
cd backend
source venv_new/bin/activate  # or venv_new\Scripts\activate on Windows
uvicorn app.main:app --reload
```

2. **Start frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```

3. **Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Testing the Setup

1. **Test backend health:**
```bash
curl http://localhost:8000/docs
```

2. **Test frontend:**
- Open http://localhost:5173 in your browser
- You should see the marketplace interface

3. **Test database connection:**
- Check backend logs for successful database connection
- Visit http://localhost:8000/docs and try the authentication endpoints

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login/access-token` - Login
- `GET /api/v1/auth/me` - Get current user

### Apps Management
- `POST /api/v1/apps/` - Create app metadata
- `POST /api/v1/apps/{app_id}/upload` - Upload source code
- `GET /api/v1/apps/` - List apps

### Deployments
- `POST /api/v1/deployments/{app_id}/deploy` - Trigger deployment
- `POST /api/v1/deployments/webhook` - Deployment status webhook

### Subscriptions & Payments
- `POST /api/v1/subscriptions/orders` - Create Razorpay order
- `POST /api/v1/subscriptions/verify` - Verify payment
- `GET /api/v1/subscriptions/` - List user subscriptions

### Access Control
- `GET /api/v1/access/launch/{app_id}` - Launch app (returns redirect URL)
- `POST /api/v1/access/verify-token` - Verify launch token

## Security Features

✅ JWT-based authentication with short-lived tokens  
✅ Role-based access control (RBAC)  
✅ Razorpay webhook signature verification  
✅ Secure token-based app launch (60-second expiry)  
✅ No iframe embedding (controlled redirects only)  
✅ Environment-based secret management  

## Deployment Flow

1. Developer uploads ZIP containing application code
2. Platform extracts and detects framework (package.json, requirements.txt)
3. Platform generates GitHub Actions workflow for selected provider
4. Automated deployment to Vercel or Render
5. Webhook captures production URL
6. Platform verifies app health (`/health` endpoint)
7. App transitions to PUBLISHED status
8. Available in marketplace for users

## Access Control Flow

1. User clicks "Open App" in marketplace
2. Platform validates active subscription
3. Platform generates short-lived JWT token (60 seconds)
4. Platform redirects to: `{app_url}/launch?token={JWT}`
5. App calls back: `POST /api/v1/access/verify-token`
6. Platform returns user information
7. App creates session and grants access

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── api_v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── apps.py
│   │   │   │   │   ├── deployments.py
│   │   │   │   │   ├── subscriptions.py
│   │   │   │   │   └── access.py
│   │   │   │   └── api.py
│   │   │   └── deps.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── app.py
│   │   │   └── subscription.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── app.py
│   │   │   └── subscription.py
│   │   ├── services/
│   │   │   ├── app_service.py
│   │   │   ├── deployment_service.py
│   │   │   ├── payment_service.py
│   │   │   └── verification_service.py
│   │   └── main.py
│   ├── alembic/
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Navbar.tsx
    │   ├── context/
    │   │   └── AuthContext.tsx
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   ├── Register.tsx
    │   │   ├── DeveloperDashboard.tsx
    │   │   ├── UserMarketplace.tsx
    │   │   └── AdminDashboard.tsx
    │   ├── services/
    │   │   └── api.ts
    │   ├── types/
    │   │   └── index.ts
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── tsconfig.json
    └── vite.config.ts
```

## Production Deployment

### Deploy to Vercel

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Configure environment variables in Vercel dashboard:**
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key
- `RAZORPAY_KEY_ID` - Razorpay key ID
- `RAZORPAY_KEY_SECRET` - Razorpay key secret

3. **Deploy:**
```bash
vercel --prod
```

### Deploy to Render

1. **Connect your GitHub repository to Render**

2. **Configure environment variables:**
- Use the same variables as listed in `.env.example`
- Set `DATABASE_URL` to your PostgreSQL instance

3. **Deploy using render.yaml configuration**
- The `render.yaml` file is already configured for automatic deployment

### Environment Variables for Production

**Required for all deployments:**
```env
DATABASE_URL=postgresql://user:password@host:port/database
SECRET_KEY=your_production_secret_key
RAZORPAY_KEY_ID=your_production_key_id
RAZORPAY_KEY_SECRET=your_production_key_secret
```

**Optional (for deployment automation):**
```env
VERCEL_TOKEN=your_vercel_token
RENDER_API_KEY=your_render_api_key
```

## Troubleshooting

### Common Issues

**1. Database Connection Error:**
```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError)
```
**Solution:**
- Verify PostgreSQL is running: `sudo service postgresql status`
- Check database credentials in `.env`
- Ensure database exists: `createdb marketplace_db`

**2. Module Not Found Error:**
```
ModuleNotFoundError: No module named 'app'
```
**Solution:**
- Ensure you're in the `backend` directory
- Activate virtual environment: `source venv_new/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

**3. Frontend Build Errors:**
```
npm ERR! peer dep missing
```
**Solution:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Ensure Node.js version is 18+

**4. Port Already in Use:**
```
Error: Port 8000 is already in use
```
**Solution:**
- Kill existing process: `lsof -ti:8000 | xargs kill -9`
- Or use different port: `uvicorn app.main:app --reload --port 8001`

**5. Alembic Migration Issues:**
```
alembic.util.exc.CommandError: Target database is not up to date
```
**Solution:**
- Check current revision: `alembic current`
- Upgrade to head: `alembic upgrade head`
- If issues persist, reset: `alembic downgrade base && alembic upgrade head`

### Development Tips

1. **Hot Reload:**
   - Backend: `uvicorn app.main:app --reload` (automatic)
   - Frontend: `npm run dev` (automatic)

2. **Database Reset:**
```bash
# Drop and recreate database
dropdb marketplace_db
createdb marketplace_db
alembic upgrade head
```

3. **View Logs:**
```bash
# Backend logs are displayed in terminal
# Frontend logs in browser console (F12)
```

4. **API Testing:**
   - Use the interactive docs at `http://localhost:8000/docs`
   - Or use tools like Postman/Insomnia

## License

This is a demonstration project for educational purposes.
