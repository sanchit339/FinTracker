# Vercel Deployment - Quick Start

## Pre-Deployment Checklist

✅ Categories inserted in Neon database  
✅ Gmail connected and tested locally  
✅ Transactions syncing with categories  
✅ Database schema complete  
✅ Neon connection string ready  

---

## Step 1: Install Vercel CLI (if needed)

```bash
npm install -g vercel
```

---

## Step 2: Environment Variables for Vercel

You'll need to add these in **Vercel Dashboard** after deployment:

```bash
# Database (CRITICAL - use your Neon connection string)
DATABASE_URL=postgresql://neondb_owner:npg_qT2zsuvPOBw6@ep-cool-cherry-ah4cuw2o-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

# JWT Secret (generate a new random 32-char string for production)
JWT_SECRET=<generate-new-secret-for-production>

# Gmail API (same as local)
GMAIL_CLIENT_ID=your_gmail_client_id_here
GMAIL_CLIENT_SECRET=your_gmail_client_secret_here
GMAIL_REDIRECT_URI=https://your-app.vercel.app/api/gmail/callback

# Cron Secret (generate new random string)
CRON_SECRET=<generate-new-secret-for-production>

# Frontend URL (will be your Vercel URL)
FRONTEND_URL=https://your-app.vercel.app

# Node Environment
NODE_ENV=production
```

**Generate secrets with:**
```bash
openssl rand -base64 32
```

---

## Step 3: Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy (first time - creates project)
vercel

# Answer prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? portfoliio (or your choice)
# - Directory? ./
# - Override settings? No
```

---

## Step 4: Add Environment Variables

**After first deployment:**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable from Step 2
5. Select **Production**, **Preview**, **Development** (all environments)

---

## Step 5: Update Gmail Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://your-app.vercel.app/api/gmail/callback
   ```
4. Keep the localhost one for local development
5. Click **Save**

---

## Step 6: Deploy to Production

```bash
# After adding environment variables, deploy to production
vercel --prod
```

---

## Step 7: Verify Deployment

1. **Visit** your Vercel URL
2. **Register/Login**
3. **Connect Gmail** (with new production redirect URI)
4. **Sync transactions**
5. **Check Analytics** - categories should appear!

---

## Vercel Cron Configuration

✅ Already configured in `vercel.json`:
- Runs every 6 hours: `0 */6 * * *`
- Endpoint: `/api/cron/sync-gmail`
- Protected by `CRON_SECRET`

**To verify cron:**
- Go to Project → Settings → Cron
- Should see: "sync-gmail" scheduled

---

## Troubleshooting

**If deployment fails:**
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Ensure DATABASE_URL is correct

**If Gmail OAuth fails:**
- Verify redirect URI matches in Google Cloud
- Check GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET

**If database connection fails:**
- Verify DATABASE_URL ends with `?sslmode=require`
- Check Neon project is not paused

---

## Post-Deployment

**Update your local `.env` for testing production:**
```bash
GMAIL_REDIRECT_URI=https://your-app.vercel.app/api/gmail/callback
```

**Monitor:**
- Vercel Dashboard → Deployments → Logs
- Check cron runs: Settings → Cron → Logs

---

Ready to deploy! 🚀
