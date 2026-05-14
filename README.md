# FinTracker

**Goal:** A fast, personal dashboard to automatically track finances by reading transaction emails from your bank using the Gmail API, combined with a simple portfolio frontend.

**Who is this for?**
Individuals who want an automated, private way to track their spending and income without manually entering every transaction or giving a third-party app full access to their bank accounts.

**Why use this?**
- **Automated:** Pulls transactions directly from your Gmail (e.g., HDFC bank alerts, Salary emails).
- **Private:** You host it yourself. No third-party data selling.
- **Insightful:** Classifies transactions into Fixed (Rent, Food) and Variable expenses to give you a clear iOS-style visual analytics breakdown of your spending habits.
- **Secure:** Uses your own Gmail API credentials.

**How to use it?**

1. **Set up Gmail API:** Obtain credentials and add them to your `.env` file (see `docs/GMAIL_SETUP.md`).
2. **Start the app:** Run `docker-compose up --build`.
3. **Access:**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3000`
4. **Login:** Access the Banking Dashboard and authenticate your Gmail to start syncing transactions.

---

### Tech Stack
- **Frontend:** React, Vite, Recharts (for iOS-like beautiful charts), React Router
- **Backend:** Node.js, Express, PostgreSQL
- **Infrastructure:** Docker & Docker Compose
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

## 🤝 Contributing
This is a personal project, but suggestions are welcome!

## 📄 License
MIT License - feel free to use this for your own projects!
