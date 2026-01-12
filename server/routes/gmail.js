import express from 'express';
import gmailService from '../services/gmailService.js';
import syncService from '../services/syncService.js';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get Gmail OAuth URL
router.get('/auth/url', authenticateToken, (req, res) => {
    try {
        console.log('🔍 Gmail auth/url called');
        console.log('🔍 Headers:', req.headers.authorization ? 'Token present' : 'NO TOKEN');
        console.log('🔍 User from token:', req.user);

        const authUrl = gmailService.getAuthUrl();
        res.json({ authUrl });
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
});

// Handle OAuth callback
router.get('/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).send('Authorization code not provided');
        }

        // Exchange code for tokens
        const tokens = await gmailService.getTokensFromCode(code);

        // Get user's email from Google
        gmailService.setRefreshToken(tokens.refresh_token);
        const gmail = gmailService.getGmailClient();
        const profile = await gmail.users.getProfile({ userId: 'me' });
        const userEmail = profile.data.emailAddress;

        // Save tokens to the most recently created user (or use state parameter if implemented)
        // For now, saving to the most recent user who doesn't have Gmail connected
        const userResult = await pool.query(
            'SELECT id FROM users WHERE gmail_refresh_token IS NULL ORDER BY id DESC LIMIT 1'
        );

        if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].id;
            await pool.query(
                'UPDATE users SET gmail_email = $1, gmail_refresh_token = $2 WHERE id = $3',
                [userEmail, tokens.refresh_token, userId]
            );
            console.log(`Gmail connected for user ${userId}: ${userEmail}`);
        }

        // Return success page
        res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #F9FAFB;
            }
            .container {
              text-align: center;
              background: white;
              padding: 3rem;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            h1 { color: #10B981; margin: 0 0 1rem; }
            p { color: #6B7280; }
            .email { color: #2563EB; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Gmail Connected!</h1>
            <p><span class="email">${userEmail}</span></p>
            <p>You can close this window and return to the app</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </div>
        </body>
      </html>
    `);
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).send(`
          <html>
            <body style="font-family: sans-serif; padding: 2rem;">
              <h2>❌ Connection Failed</h2>
              <p>${error.message}</p>
              <p>Please close this window and try again.</p>
            </body>
          </html>
        `);
    }
});

// Save Gmail tokens
router.post('/tokens', authenticateToken, async (req, res) => {
    try {
        const { refreshToken, email } = req.body;
        const userId = req.user.userId;

        // Save refresh token to user record
        await pool.query(
            'UPDATE users SET gmail_email = $1, gmail_refresh_token = $2 WHERE id = $3',
            [email, refreshToken, userId]
        );

        res.json({ success: true, message: 'Gmail connected successfully' });
    } catch (error) {
        console.error('Error saving tokens:', error);
        res.status(500).json({ error: 'Failed to save Gmail credentials' });
    }
});

// Get Gmail connection status
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query(
            'SELECT gmail_email FROM users WHERE id = $1',
            [userId]
        );

        const gmailEmail = result.rows[0]?.gmail_email;

        res.json({
            connected: !!gmailEmail,
            email: gmailEmail || null
        });
    } catch (error) {
        console.error('Error checking Gmail status:', error);
        res.status(500).json({ error: 'Failed to check Gmail status' });
    }
});

// Disconnect Gmail
router.post('/disconnect', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        await pool.query(
            'UPDATE users SET gmail_email = NULL, gmail_refresh_token = NULL WHERE id = $1',
            [userId]
        );
        res.json({ success: true, message: 'Gmail disconnected' });
    } catch (error) {
        console.error('Error disconnecting Gmail:', error);
        res.status(500).json({ error: 'Failed to disconnect Gmail' });
    }
});

// Sync emails manually
router.post('/sync', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const results = await syncService.syncGmailForUser(userId);
        res.json(results);
    } catch (error) {
        console.error('Sync endpoint error:', error);
        res.status(500).json({
            error: 'Failed to sync emails',
            details: error.message
        });
    }
});

// Sync ALL emails from start of month (ignores last_gmail_sync)
router.post('/sync-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Temporarily clear last_gmail_sync to force full month sync
        await pool.query('UPDATE users SET last_gmail_sync = NULL WHERE id = $1', [userId]);

        const results = await syncService.syncGmailForUser(userId);
        res.json(results);
    } catch (error) {
        console.error('Sync-all endpoint error:', error);
        res.status(500).json({
            error: 'Failed to sync all emails',
            details: error.message
        });
    }
});

// Get sync status
router.get('/sync/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const status = await syncService.getSyncStatus(userId);
        res.json(status);
    } catch (error) {
        console.error('Error checking sync status:', error);
        res.status(500).json({ error: 'Failed to check sync status' });
    }
});

// Reset all synced data (DEVELOPMENT ONLY)
router.post('/reset', authenticateToken, async (req, res) => {
    try {
        // Only allow in development
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Reset not allowed in production' });
        }

        const userId = req.user.userId;

        // Delete all transactions for this user
        await pool.query('DELETE FROM transactions WHERE user_id = $1', [userId]);

        // Reset last_gmail_sync to allow full re-sync
        await pool.query('UPDATE users SET last_gmail_sync = NULL WHERE id = $1', [userId]);

        // Clear sync state
        await pool.query('DELETE FROM gmail_sync_state WHERE user_id = $1', [userId]);

        console.log(`🗑️ Reset completed for user ${userId}`);

        res.json({
            success: true,
            message: 'All transactions cleared. You can now sync from scratch.'
        });

    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
