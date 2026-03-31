import express from 'express';
import pool from '../config/database.js';
import { isHybridInsightsEnabled } from '../config/features.js';
import insightsService from '../services/insightsService.js';
import syncService from '../services/syncService.js';

const router = express.Router();

const isAuthorizedCronCall = (req) => {
    const authHeader = req.headers.authorization;
    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

    return Boolean(authHeader && authHeader === expectedSecret);
};

// Vercel Cron endpoint for automated Gmail sync
router.post('/sync-gmail', async (req, res) => {
    try {
        if (!isAuthorizedCronCall(req)) {
            console.error('Unauthorized cron request');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log('Starting automated Gmail sync for all users...');

        const usersResult = await pool.query(
            'SELECT id, username, gmail_email FROM users WHERE gmail_refresh_token IS NOT NULL'
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
                console.log(`Syncing emails for user ${user.id} (${user.username})...`);
                await syncService.syncGmailForUser(user.id);
                results.successful++;
            } catch (error) {
                console.error(`Failed to sync for user ${user.id}:`, error.message);
                results.failed++;
                results.errors.push({
                    userId: user.id,
                    username: user.username,
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

// Vercel/GitHub Cron endpoint for hybrid insights computation
router.post('/compute-insights', async (req, res) => {
    try {
        if (!isAuthorizedCronCall(req)) {
            console.error('Unauthorized cron request');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!isHybridInsightsEnabled()) {
            return res.status(404).json({
                error: 'Insights feature is disabled'
            });
        }

        console.log('Starting automated hybrid insights run for active users...');

        const usersResult = await pool.query(
            `SELECT DISTINCT user_id
             FROM transactions
             ORDER BY user_id ASC`
        );

        const users = usersResult.rows;
        const results = {
            total: users.length,
            successful: 0,
            failed: 0,
            errors: []
        };

        for (const user of users) {
            try {
                const userId = parseInt(user.user_id, 10);
                console.log(`Computing insights for user ${userId}...`);
                await insightsService.runHybridInsightsForUser(userId, { triggerSource: 'cron' });
                results.successful++;
            } catch (error) {
                console.error(`Failed insights run for user ${user.user_id}:`, error.message);
                results.failed++;
                results.errors.push({
                    userId: user.user_id,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: 'Hybrid insights computation completed',
            results
        });
    } catch (error) {
        console.error('Insights cron job error:', error);
        res.status(500).json({
            error: 'Failed to run insights job',
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
