# GitHub Actions Setup for 6-Hour Gmail Sync

## What This Does

Since Vercel Hobby plan only allows **daily cron jobs**, we use GitHub Actions (100% free) to trigger Gmail sync **every 6 hours**.

**Current Setup:**
- **Vercel Cron**: Runs daily at midnight (`0 0 * * *`)
- **GitHub Actions**: Runs every 6 hours (`0 */6 * * *`) ← Use this for frequent syncing!

---

## Setup GitHub Actions (One-Time)

### 1. Add Secrets to GitHub Repository

Go to your repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 2 secrets:

**Secret 1: `VERCEL_URL`**
```
Value: https://your-app-name.vercel.app
```
(Your actual Vercel deployment URL - get it after Vercel deploys)

**Secret 2: `CRON_SECRET`**
```
Value: sEiscI2M1kuuderUfhQe3f0yBpjRiorc9CqJ2/OO5xM=
```
(The same secret you used in Vercel environment variables)

---

### 2. Enable GitHub Actions

1. Go to your repo → **Actions** tab
2. You should see "Gmail Sync Every 6 Hours" workflow
3. Click **Enable workflow** (if needed)

---

### 3. Test Manual Trigger

1. Go to **Actions** tab
2. Click "Gmail Sync Every 6 Hours"
3. Click **Run workflow** → **Run workflow**
4. Wait ~30 seconds
5. Check if it succeeded (green checkmark)

---

## How It Works

```
Every 6 hours → GitHub Actions triggers → 
Calls https://your-app.vercel.app/api/cron/sync-gmail → 
Vercel serverless function runs → 
Syncs Gmail for all users → 
Updates last_gmail_sync timestamp
```

**FREE:** GitHub Actions gives you 2,000 minutes/month for free (way more than needed!)

---

## Schedule

- **00:00 UTC** (5:30 AM IST) - Morning sync
- **06:00 UTC** (11:30 AM IST) - Midday sync  
- **12:00 UTC** (5:30 PM IST) - Evening sync
- **18:00 UTC** (11:30 PM IST) - Night sync

Plus **Vercel daily cron** at midnight as backup.

---

## Monitoring

**Check if it's working:**
1. Go to **Actions** tab in GitHub
2. See recent workflow runs
3. Green ✅ = Success, Red ❌ = Failed

**Check Vercel logs:**
1. Vercel Dashboard → Your Project
2. **Logs** tab
3. Look for: "🔍 Gmail auth/url called"

---

## Disable If Needed

**To stop 6-hour sync:**
1. Go to `.github/workflows/sync-gmail.yml`
2. Delete the file or comment out the `schedule:` section

**Vercel daily cron will continue** running at midnight.

---

✅ **Best of both worlds:** Free 6-hour sync via GitHub Actions + Vercel daily backup!

---

## Hybrid Insights Workflow (New)

There is a second workflow at `.github/workflows/compute-insights.yml`:

- **Name:** Hybrid Insights Compute
- **Schedule:** Daily at 01:15 UTC (06:45 IST)
- **Endpoint:** `/api/cron/compute-insights`
- **Secrets used:** `VERCEL_URL`, `CRON_SECRET` (same as Gmail workflow)

This workflow computes cached pattern + cluster snapshots for the new `/insights` page.
