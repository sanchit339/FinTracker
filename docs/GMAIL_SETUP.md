# Gmail API Setup Guide

This guide will help you set up Gmail API credentials to enable automatic transaction syncing from your bank emails.

## Prerequisites

- A Google account
- Access to your Gmail inbox with bank transaction emails

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter project name: `FinTrack` (or any name you prefer)
5. Click "Create"

## Step 2: Enable Gmail API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Gmail API"
3. Click on "Gmail API"
4. Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type
3. Click "Create"
4. Fill in the required fields:
   - **App name**: FinTrack (or your preferred name)
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click "Save and Continue"

6. **Scopes** page (OPTIONAL - you can skip this):
   - If you see "Add or Remove Scopes" button, click it
   - Search for "Gmail" and select:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
   - Click "Update"
   - **Note**: If you don't see this section, that's fine! Scopes will be requested automatically when your app runs.

7. Click "Save and Continue"

8. On **Test users** page (IMPORTANT):
   - Click "Add Users"
   - Enter your Gmail address (the one you'll use for transaction syncing)
   - Click "Add"
   - Click "Save and Continue"

9. Review the summary and click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click "**+ Create Credentials**" at the top
3. Select "**OAuth client ID**"
4. If prompted to configure consent screen, you've already done this - click "Select" to choose your configured consent screen
5. **Application type**: Select "**Web application**"
6. **Name**: Enter "FinTrack Web Client" (or any name)
7. Under **Authorized redirect URIs**:
   - Click "**+ Add URI**"
   - Enter: `http://localhost:3000/api/gmail/callback`
   - ⚠️ **IMPORTANT**: No trailing slash! Do NOT add `/` at the end
   - ⚠️ Make sure there are no typos - this must match exactly!
   - Should be: `http://localhost:3000/api/gmail/callback` ✅
   - NOT: `http://localhost:3000/api/gmail/callback/` ❌
8. Click "**Create**"
9. A popup will show your credentials:
   - **Client ID**: Copy this (looks like: `xxxxx.apps.googleusercontent.com`)
   - **Client Secret**: Copy this (looks like: `GOCSPX-xxxxx`)
   - Click "OK" to close the popup
   - You can always view these later from the Credentials page

## Step 5: Update Environment Variables

1. Open your `.env` file in the project root
2. Add the following lines with your credentials:

```env
# Gmail API Credentials
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

3. Save the file

## Step 6: Restart Docker Containers

```bash
docker-compose restart backend
```

## Step 7: Connect Gmail

1. Open your app at http://localhost:5173
2. Go to Settings
3. Click "Connect Gmail Account"
4. Authorize access to your Gmail
5. You'll be redirected back to the app

## Step 8: Sync Transactions

1. Go to Dashboard
2. Click "Sync Gmail"
3. Your bank transaction emails will be parsed and displayed!

---

## Troubleshooting

### "Failed to start Gmail authorization"
- Make sure you've added `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` to `.env`
- Restart the backend container after updating `.env`

### "Access blocked: This app's request is invalid"
- Check that the redirect URI in Google Cloud Console matches exactly: `http://localhost:3000/api/gmail/callback`

### "This app isn't verified"
- This is normal for development. Click "Advanced" then "Go to FinTrack (unsafe)"
- For production use, you'll need to verify the app with Google

### No transactions appearing
- Make sure you have bank transaction emails in your Gmail
- Check that emails are from HDFC, Union Bank, or IOB
- Check browser console for parsing errors

---

## For Production Deployment

When deploying to GCP or other servers:

1. Update redirect URI in Google Cloud Console:
   - Add: `https://yourdomain.com/api/gmail/callback`

2. Update `.env`:
   ```env
   GMAIL_REDIRECT_URI=https://yourdomain.com/api/gmail/callback
   FRONTEND_URL=https://yourdomain.com
   ```

3. Submit app for verification if needed

---

## Security Notes

- ✅ Your Gmail password is **never** stored or accessed
- ✅ Only transaction emails are read (from bank addresses)
- ✅ Refresh tokens are encrypted in the database
- ✅ All API calls use OAuth 2.0 authentication
- ✅ You can revoke access anytime from [Google Account Settings](https://myaccount.google.com/permissions)
