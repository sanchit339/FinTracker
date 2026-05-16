# PortFoliio / FinTracker
By sanchit339 (sanchitingale09@gmail.com)

**Goal:** A fast, personal dashboard to automatically track finances by reading transaction emails from your bank using the Gmail API, combined with a simple portfolio frontend.

**Who is this for?**
Individuals who want an automated, private way to track their spending and income without manually entering every transaction or giving a third-party app full access to their bank accounts.

**Why use this?**
- **Automated:** Pulls transactions directly from your Gmail (e.g., HDFC bank alerts, Salary emails).
- **Private:** You host it yourself. No third-party data selling.
- **Insightful:** Classifies transactions into Fixed (Rent, Food) and Variable expenses to give you a clear iOS-style visual analytics breakdown of your spending habits.
- **Secure:** Uses your own Gmail API credentials.

---

## 🚀 Features & Personalization

This codebase has been specifically tuned with highly personalized logic for Indian use cases and micro-transactions:

- **Smart Transit Detection:** Advanced logic to catch local Indian transit. For example, any specific **₹13** transaction is automatically and strictly categorized as **Transportation** (perfect for daily BEST bus or metro tickets), overriding obscure UPI vendor names.
- **Advanced Filtering Engine:** Filter your transaction history not just by type or keyword, but with precise **From & To Date ranges** and **Explicit Categories**.
- **Dynamic Aggregates:** Powered by concurrent PostgreSQL queries (`Promise.all`), the backend calculates and returns accurate income and expense totals for your *exact* filtered dataset, ensuring the frontend summaries are always accurate regardless of pagination.
- **Hybrid Insights Engine:** Automatically generates transaction clusters and spending patterns for intelligent financial tracking.

---

### Tech Stack
- **Frontend:** React, Vite, Recharts (for iOS-like beautiful charts), React Router
- **Backend:** Node.js, Express, PostgreSQL
- **Infrastructure:** Docker & Docker Compose

## 🛠️ How to use it?

1. **Set up Gmail API:** Obtain credentials and add them to your `.env` file (see `docs/GMAIL_SETUP.md`).
2. **Start the app:** Run `docker-compose up --build`.
3. **Access:**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3000`
4. **Login:** Access the Banking Dashboard and authenticate your Gmail to start syncing transactions.

### Docker Commands

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

## 🎨 Architecture Breakdown

### Frontend Components
- **Landing**: Hero section with stats and animations
- **Dashboard**: Banking dashboard with account management
- **Transactions**: Advanced ledger view with date-range filters, category dropdowns, and dynamic aggregate cards.
- **BankCard**: Individual bank account card with balance/transactions

### Backend APIs

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify token

#### Banking (Protected)
- `GET /api/banking/transactions/recent` - Get recent transactions (Supports `startDate`, `endDate`, `categoryId`)
- `GET /api/banking/categories` - Fetch system and user categories
- `PUT /api/banking/transactions/:id/category` - Inline edit transaction category
- `GET /api/banking/accounts` - List linked accounts

#### Gmail Integration
- `GET /api/gmail/connect` - Initiate Gmail OAuth
- `GET /api/gmail/callback` - OAuth callback
- `POST /api/gmail/sync` - Sync transactions from Gmail

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ Bcrypt password hashing
- ✅ Parameterized SQL queries (preventing SQL injection)
- ✅ HTTPS enforcement (production)
- ✅ Rate limiting
- ✅ Helmet security headers
- ✅ CORS protection

## 📧 Gmail API Setup

For proper transaction tracking, you need to set up Gmail API access:

1. **See Complete Guide**: `docs/GMAIL_SETUP.md`
2. **Quick Setup**:
   - Create Google Cloud Project
   - Enable Gmail API
   - Configure OAuth consent screen
   - Create OAuth 2.0 credentials
   - Add credentials to `.env` file

## 🤝 Contributing
This is a personal project by **sanchit339**, but suggestions are welcome!

## 📄 License
MIT License - feel free to use this for your own projects!
