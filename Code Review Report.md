# FinTracker Code Review & Security Audit Report

## Executive Summary
*(To be filled after review)*

## 1. Security Vulnerabilities
### High Severity
*(e.g., SQL Injection, Broken Authentication, Sensitive Data Exposure)*

### Medium Severity
*(e.g., Missing Rate Limiting, CSRF, Misconfigured CORS)*

### Low Severity
*(e.g., Information Leakage, Missing Security Headers)*

## 2. Backend Design & Best Practices (Node.js/Express/PostgreSQL)
### Architecture & Structure
- **RESTful routing**: The backend cleanly separates routes (`auth`, `banking`, `dashboard`, `analytics`, `gmail`, `cron`).
- **Authentication**: JWT is securely implemented in a central middleware `server/middleware/auth.js`. Passwords are hashed using `bcrypt` with salt rounds set to 10 (which is a standard secure practice).
- **Missing payload size limit**: `app.use(express.json())` does not specify a size limit. This might allow an attacker to send an extremely large JSON payload, causing an Out-Of-Memory (OOM) error (Denial of Service). **Recommendation:** Set a limit e.g. `express.json({ limit: '100kb' })`.
- **Validation**: Basic validation exists in `/register` (checks for empty fields and password length), but there's no regex evaluation for proper email formatting.

### Database & Performance
- **SQL Injection Prevention**: All queries to PostgreSQL use strict parameterized query variables (e.g., `WHERE user_id = $1`), completely mitigating SQL Injection vulnerabilities. Good job!
- **Connection Pooling**: `pg` Pool is used correctly to reuse DB connections and limit connection spikes.

### Security Configurations
- **Rate Limiting**: Global rate limiting is applied to all `/api/` endpoints (100 requests per 15 minutes in production). While this mitigates generic DDoS, it might be restrictive for active users navigating the dashboard. Crucially, **Authentication endpoints (`/login`, `/register`) should have their own strict rate limits** (e.g. 5 attempts per 15 mins) to prevent brute-force attacks and credential stuffing.
- **Headers**: Helmet and CORS are configured appropriately, restricting cross-origin requests to `FRONTEND_URL`.
- **Cron Jobs**: Vercel cron endpoints are correctly secured using `Authorization: Bearer CRON_SECRET`.

## 3. Frontend Design & Best Practices (React)
### Component Structure & State
- **State Management**: Uses React hooks (`useState`, `useEffect`) effectively.
- **Client-Side Filtering Bug**: In `Transactions.jsx`, the "Search by description, bank, or category" functionality filters the *local* array of currently loaded transactions (due to pagination). If a user has 100 transactions but only 20 are loaded, searching won't find the remaining 80. Search should be offloaded to the backend.

### API Integration & Data Fetching
- **Token Management**: The application stores the JWT in `localStorage`. While this simplifies API calls and perfectly mitigates Cross-Site Request Forgery (CSRF) vulnerabilities by sending tokens explicitly via the `Authorization` header, the token can be stolen via Cross-Site Scripting (XSS).
- **Hardcoded Error Handling**: In some React components like `Settings.jsx`, user-facing alerts are generated using `.includes('✅')` condition. A cleaner approach would be utilizing a dedicated toast notification system with built-in states (success, error, warning).

### UI/UX & Client-side Security
- **XSS Prevention**: Verified that `dangerouslySetInnerHTML` is never used throughout the frontend directory. React cleanly escapes strings, greatly reducing XSS risks.
- **Missing Loading Skeletons**: App relies on basic spinners. Skeletons would make the UX feel faster.

## 4. Actionable Recommendations
1. **Critical:** Implement rate limiting specifically for `/login` and `/register` endpoints to block brute-force attacks (e.g., maximum 5 attempts per IP per 15 minutes).
2. **High:** Add an explicit file-size limit to the global `express.json()` middleware in `server/index.js` (e.g., `{ limit: '100kb' }`) to prevent memory exhaustion Denial of Service (DoS) attacks.
3. **Medium:** Fix the client-side search bug in `Transactions.jsx` by passing the `searchTerm` to the `/api/banking/transactions/recent` backend endpoint instead of filtering the paginated array locally.
4. **Low:** Add regex format validation for the email field in the `/register` endpoint to prevent registering malformed user accounts.
5. **Low:** Consider migrating from `localStorage` token storage to HTTP-Only `Secure` cookies for enhanced protection against potential future XSS vulnerabilities.
