import express from 'express';
import authenticateToken from '../middleware/auth.js';
import syncService from '../services/syncService.js';

const router = express.Router();

// Vercel Cron endpoint for automated Gmail sync
router.post('/sync-gmail', async (req, res) => {
    try {
        // Verify request is from Vercel Cron (using Authorization header)
        const authHeader = req.headers.authorization;
        const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

        if (!authHeader || authHeader !== expectedSecret) {
            console.error('Unauthorized cron request');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log('Starting automated Gmail sync for all users...');

        // Get all users with Gmail connected
        const pool = (await import('../config/database.js')).default;
        const usersResult = await pool.query(
            'SELECT DISTINCT user_id FROM gmail_tokens WHERE is_valid = true'
        );

        const users = usersResult.rows;
        const results = {
            total: users.length,
            successful: 0,
            failed: 0,
            errors: []
        };

        // Sync emails for each user
        for (const user of users) {
            try {
                console.log(`Syncing emails for user ${user.user_id}...`);
                await syncService.syncUserEmails(user.user_id);
                results.successful++;
            } catch (error) {
                console.error(`Failed to sync for user ${user.user_id}:`, error.message);
                results.failed++;
                results.errors.push({
                    userId: user.user_id,
                    error: error.message
                });
            }
        }

        console.log('Automated sync completed:', results);

        res.json({
            success: true,
            message: 'Gmail sync completed',
            results
        });

    } catch (error) {
        console.error('Cron job error:', error);
        res.status(500).json({
            error: 'Failed to run sync job',
            message: error.message
        });
    }
});

// Health check endpoint (no auth needed)
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'cron'
    });
});

export default router;
