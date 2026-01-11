# Vercel Deployment Guide

## Quick Start

### 1. Set Up Neon PostgreSQL (5 minutes)

1. **Sign up at** [neon.tech](https://neon.tech)
2. **Create new project** → Name it "PortFoliio"
3. **Copy connection string** (looks like):
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. **Run schema** on Neon database:
   - Go to Neon SQL Editor
   - Copy contents from `server/db/schema.sql`
   - Run it to create all tables

---

### 2. Deploy to Vercel (10 minutes)

#### A. Install Vercel CLI
```bash
npm install -g vercel
```

#### B. Configure Environment Variables

**Copy `.env.example` to `.env.production`** and update:

```bash
# Neon Database (PASTE YOUR CONNECTION STRING HERE)
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# JWT Secret (Generate random string)
JWT_SECRET=<generate-32-char-random-string>

# Gmail API (from Google Cloud Console)
GMAIL_CLIENT_ID=your_google_client_id
GMAIL_CLIENT_SECRET=your_google_secret
GMAIL_REDIRECT_URI=https://your-app.vercel.app/api/gmail/callback

# Cron Secret (Generate random string for security)
CRON_SECRET=<generate-32-char-random-string>

# Frontend URL (will be your Vercel deployment URL)
FRONTEND_URL=https://your-app.vercel.app
```

**To generate random secrets:**
```bash
# On Mac/Linux
openssl rand -base64 32

# Or use online: https://generate-secret.vercel.app
```

#### C. Deploy

```bash
# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? portfoliio
# - Directory? ./
# - Override settings? No

# Add environment variables in Vercel Dashboard:
# Go to: Project Settings → Environment Variables
# Add each variable from .env.production

# Deploy to production
vercel --prod
```

---

### 3. Configure Gmail Redirect URI

Update your Google Cloud Console OAuth redirect URI to:
```
https://your-app.vercel.app/api/gmail/callback
```

---

### 4. Test Deployment

1. **Visit** `https://your-app.vercel.app`
2. **Register/Login**
3. **Connect Gmail** in Settings
4. **Sync transactions**
5. **Check cron** - Wait 6 hours or check Vercel logs

---

## Vercel Configuration Files

### `vercel.json` (Already Created ✅)
```json
{
  "version": 2,
  "crons": [{
    "path": "/api/cron/sync-gmail",
    "schedule": "0 */6 * * *"
  }]
}
```

### Cron Endpoint (Already Created ✅)
`server/routes/cron.js` - Automatically syncs all users' emails every 6 hours

---

## Verification Checklist

- [ ] Neon database created and schema loaded
- [ ] All environment variables set in Vercel
- [ ] Gmail redirect URI updated in Google Cloud
- [ ] App deployed and accessible
- [ ] Can register/login
- [ ] Can connect Gmail
- [ ] Can sync transactions
- [ ] Cron job scheduled (check Vercel → Settings → Cron)

---

## Troubleshooting

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Ensure `?sslmode=require` is at the end
- Check Neon project is not paused

### Gmail Sync Not Working
- Check `GMAIL_REDIRECT_URI` matches in both Google Cloud and `.env`
- Verify Gmail API is enabled
- Check Vercel function logs

### Cron Not Running
- Verify `CRON_SECRET` is set in Vercel env vars
- Check cron is enabled in Vercel project settings
- View cron logs in Vercel dashboard

---

## Monitoring

**View Logs:**
```bash
vercel logs
```

**Or in Vercel Dashboard:**
- Project → Deployments → Latest → Runtime Logs

**Check Cron Runs:**
- Project → Settings → Cron → View Logs

---

## Cost Breakdown

| Service | Monthly Cost |
|---------|--------------|
| Vercel (Hobby) | $0 |
| Neon PostgreSQL | $0 |
| **Total** | **$0** |

**Limits:**
- Vercel: 100GB bandwidth, 100 serverless invocations/day
- Neon: 512MB storage, 1 compute hour/day
- Perfect for personal use! ✅

---

## Next Steps

1. **Set up Neon database** → Get connection string
2. **Update `.env` in this project** → Add `DATABASE_URL`
3. **Run** `vercel` command → Deploy
4. **Add environment variables** in Vercel dashboard
5. **Update Gmail redirect URI** in Google Cloud
6. **Test and enjoy!** 🚀
