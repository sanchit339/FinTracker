# Portfolio Website with Financial Tracker

A modern, secure portfolio website with integrated financial tracking dashboard using Gmail API for automated transaction extraction from bank emails. Built with React, Node.js, PostgreSQL, and Docker.

## 🚀 Features

### Portfolio Website (Public)
- ✨ Modern, premium UI with glassmorphism effects
- 🎨 Vibrant gradients and smooth animations
- 📱 Fully responsive design
- 🎯 Sections: Landing, About, Projects, Contact
- ⚡ Built with React and Vite for blazing-fast performance

### Financial Tracker Dashboard (Private)
- 🔐 Secure JWT authentication
- 📧 Gmail API integration for automated transaction tracking
- 💰 Real-time transaction monitoring from bank emails
- 📊 Transaction history with filtering and search
-  Analytics and spending insights
- 🧠 Hybrid Insights (feature-flagged): rule-based patterns + clustering snapshots

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, React Router
- **Backend**: Node.js, Express
- **Database**: PostgreSQL 16
- **Authentication**: JWT with bcrypt
- **Email API**: Gmail API for transaction extraction
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Docker and Docker Compose installed
- Gmail API credentials (see docs/GMAIL_SETUP.md)

## 🚀 Quick Start

### 1. Clone and Navigate
```bash
cd /Users/sanchitingale/Development/PortFoliio
```

### 2. Set Up Environment Variables
The `.env` file is already created. Update Gmail credentials:
```bash
# Add your Gmail API credentials (see docs/GMAIL_SETUP.md for instructions)
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

### 3. Start All Services with Docker
```bash
docker-compose up --build
```

This will start:
- **PostgreSQL** database on port 5432
- **Backend API** on port 3000
- **Frontend** on port 5173

### 4. Access the Application
- **Portfolio Website**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432

### 5. Login to Banking Dashboard
Click "Banking Dashboard" in the navigation and use:
- **Username**: `demo`
- **Password**: `demo1234`

Or register a new account!

## 📁 Project Structure

```
PortFoliio/
├── server/                 # Backend Node.js application
│   ├── config/            # Database, Gmail configuration
│   ├── middleware/        # Authentication middleware
│   ├── routes/            # API routes
│   ├── services/          # Gmail sync service layer
│   ├── db/                # Database schema
│   └── index.js           # Express server
├── src/                   # Frontend React application
│   ├── components/        # React components
│   ├── App.jsx           # Main app with routing
│   ├── main.jsx          # React entry point
│   └── index.css         # Global styles
├── docs/                  # Documentation
│   └── GMAIL_SETUP.md    # Gmail API setup guide
├── docker-compose.yml    # Docker multi-container setup
├── Dockerfile.dev        # Development Dockerfile
├── vite.config.js        # Vite configuration
└── package.json          # Dependencies
```

## 🔧 Development Commands

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up --build

# Access PostgreSQL
docker exec -it portfoliio-db psql -U portfoliio_user -d portfoliio_db
```

## 🎨 Features Breakdown

### Frontend Components
- **Landing**: Hero section with stats and animations
- **About**: Skills showcase with progress bars
- **Projects**: Project cards with tags
- **Contact**: Contact form and social links
- **Login**: Authentication with registration
- **Dashboard**: Banking dashboard with account management
- **BankCard**: Individual bank account card with balance/transactions

### Backend APIs

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify token

#### Banking (Protected)
- `GET /api/banking/transactions/recent` - Get recent transactions
- `GET /api/banking/accounts` - List linked accounts
- `POST /api/banking/accounts/link` - Link bank account

#### Gmail Integration
- `GET /api/gmail/connect` - Initiate Gmail OAuth
- `GET /api/gmail/callback` - OAuth callback
- `POST /api/gmail/sync` - Sync transactions from Gmail

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ Bcrypt password hashing
- ✅ HTTPS enforcement (production)
- ✅ Rate limiting
- ✅ Helmet security headers
- ✅ CORS protection
- ✅ No credential storage (AA framework)
- ✅ Environment variable protection

## 📧 Gmail API Setup

For proper transaction tracking, you need to set up Gmail API access:

1. **See Complete Guide**: docs/GMAIL_SETUP.md
2. **Quick Setup**:
   - Create Google Cloud Project
   - Enable Gmail API
   - Configure OAuth consent screen
   - Create OAuth 2.0 credentials
   - Add credentials to .env file

3. **Connect Gmail**:
   - Login to dashboard
   - Go to Settings
   - Click "Connect Gmail Account"
   - Authorize access

## 🚢 Deployment to GCP

### Prerequisites
- GCP e2-micro instance running
- Docker installed on instance
- Domain with SSL certificate

### Deploy
```bash
# SSH to your GCP instance
# Clone repository
# Update .env with production values
# Run containers
docker-compose -f docker-compose.prod.yml up -d
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_USER` | PostgreSQL username | portfoliio_user |
| `DB_PASSWORD` | PostgreSQL password | portfoliio_password |
| `DB_NAME` | Database name | portfoliio_db |
| `JWT_SECRET` | JWT signing secret | (change in production) |
| `GMAIL_CLIENT_ID` | Gmail API client ID | - |
| `GMAIL_CLIENT_SECRET` | Gmail API client secret | - |
| `GMAIL_REDIRECT_URI` | Gmail OAuth redirect | http://localhost:3000/api/gmail/callback |
| `CRON_SECRET` | Secret used by Vercel/GitHub cron endpoints | (set in production) |
| `ENABLE_HYBRID_INSIGHTS` | Backend toggle for `/api/insights` and cron compute | false |
| `VITE_ENABLE_HYBRID_INSIGHTS` | Frontend toggle for `/insights` page and sidebar item | false |

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

## 📄 License

MIT License - feel free to use this for your own projects!

## 🙏 Acknowledgments

- Google for the Gmail API
- React and Vite teams
- All open source contributors

---

Built with ❤️ using modern web technologies
