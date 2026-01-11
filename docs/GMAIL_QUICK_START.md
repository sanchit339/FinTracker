# Quick Gmail Setup Guide

## TL;DR Version

If you're familiar with Google Cloud, here's the quick version:

1. **Google Cloud Console** → Create Project → Enable Gmail API
2. **OAuth consent screen** → External → Fill basic info → Add your email as test user
3. **Credentials** → Create OAuth Client ID → Web application
4. **Redirect URI**: `http://localhost:3000/api/gmail/callback` (⚠️ NO trailing slash!)
5. Copy **Client ID** and **Client Secret**
6. Add to `.env`:
   ```
   GMAIL_CLIENT_ID=your_client_id
   GMAIL_CLIENT_SECRET=your_client_secret
   GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
   ```
7. `docker-compose restart backend`
8. Connect Gmail in app Settings

---

## Common Issues

### "Can't find Scopes section in OAuth consent screen"
- **This is normal!** Google made scopes optional for testing
- Your app will request scopes automatically when users authorize
- Just skip the Scopes page and continue

### "This app isn't verified"
- Click "Advanced" → "Go to [Your App] (unsafe)"
- This is expected for development/testing
- For production, submit for Google verification

### "Access blocked: redirect_uri_mismatch"
- Double-check the redirect URI in Google Cloud Console
- Must be exactly: `http://localhost:3000/api/gmail/callback`
- No trailing slash, no extra spaces

### "Failed to start Gmail authorization"
- Verify `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` are in `.env`
- Make sure there are no quotes around the values
- Restart backend: `docker-compose restart backend`

---

**Full detailed guide**: See [GMAIL_SETUP.md](./GMAIL_SETUP.md)
