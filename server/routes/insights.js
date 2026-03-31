import express from 'express';
import authenticateToken from '../middleware/auth.js';
import insightsService from '../services/insightsService.js';
import { isHybridInsightsEnabled } from '../config/features.js';

const router = express.Router();

router.use(authenticateToken);

router.use((req, res, next) => {
    if (!isHybridInsightsEnabled()) {
        return res.status(404).json({
            error: 'Insights feature is disabled'
        });
    }

    return next();
});

router.get('/status', async (req, res) => {
    try {
        const userId = req.user.userId;
        const status = await insightsService.getStatus(userId);

        res.json(status);
    } catch (error) {
        console.error('Insights status error:', error);
        res.status(500).json({ error: 'Failed to fetch insights status' });
    }
});

router.get('/snapshot', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { month } = req.query;

        const snapshot = await insightsService.getSnapshotForMonth(userId, month);
        res.json(snapshot);
    } catch (error) {
        console.error('Insights snapshot error:', error);

        if (error.message.includes('Invalid month')) {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to fetch insights snapshot' });
    }
});

router.post('/run', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { forceClusterRebuild = false, month } = req.body || {};

        const result = await insightsService.runHybridInsightsForUser(userId, {
            triggerSource: 'manual',
            forceClusterRebuild: forceClusterRebuild === true,
            month: typeof month === 'string' ? month : null
        });

        res.json(result);
    } catch (error) {
        console.error('Insights manual run error:', error);

        if (error.message.includes('Invalid month')) {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to run insights computation' });
    }
});

export default router;
