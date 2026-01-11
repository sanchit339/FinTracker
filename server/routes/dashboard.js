import express from 'express';
import authenticateToken from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get current month start/end
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Get monthly stats
        const statsResult = await pool.query(
            `SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END), 0) as total_expenses
             FROM transactions 
             WHERE user_id = $1 
             AND transaction_date >= $2 
             AND transaction_date <= $3`,
            [userId, startOfMonth, endOfMonth]
        );

        const stats = statsResult.rows[0];
        const totalIncome = parseFloat(stats.total_income) || 0;
        const totalExpenses = parseFloat(stats.total_expenses) || 0;

        // Get account balances
        const accountsResult = await pool.query(
            `SELECT COALESCE(SUM(current_balance), 0) as total_balance 
             FROM accounts 
             WHERE user_id = $1`,
            [userId]
        );

        const totalBalance = parseFloat(accountsResult.rows[0]?.total_balance) || 0;

        res.json({
            totalBalance: totalBalance,
            monthlyIncome: totalIncome,
            monthlyExpenses: totalExpenses,
            transactionCount: parseInt(stats.total_transactions) || 0,
            netCashFlow: totalIncome - totalExpenses
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

export default router;
