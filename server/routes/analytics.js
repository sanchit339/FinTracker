import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get analytics stats
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { startDate, endDate } = req.query;

        // Default to current month if no dates provided
        const now = new Date();
        const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Get total income and expenses for the period
        const totalsQuery = `
            SELECT 
                SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as total_expenses,
                COUNT(CASE WHEN type = 'CREDIT' THEN 1 END) as income_count,
                COUNT(CASE WHEN type = 'DEBIT' THEN 1 END) as expense_count
            FROM transactions
            WHERE user_id = $1 
            AND transaction_date BETWEEN $2 AND $3
        `;

        const totalsResult = await pool.query(totalsQuery, [userId, start, end]);
        const totals = totalsResult.rows[0];

        const totalIncome = parseFloat(totals.total_income || 0);
        const totalExpenses = parseFloat(totals.total_expenses || 0);
        const savings = totalIncome - totalExpenses;

        // Calculate average daily spending based on actual days with transactions
        const uniqueDaysQuery = `
            SELECT COUNT(DISTINCT DATE(transaction_date)) as transaction_days
            FROM transactions
            WHERE user_id = $1 
            AND type = 'DEBIT'
            AND transaction_date BETWEEN $2 AND $3
        `;

        const uniqueDaysResult = await pool.query(uniqueDaysQuery, [userId, start, end]);
        const transactionDays = parseInt(uniqueDaysResult.rows[0].transaction_days) || 1;
        const avgDailySpending = totalExpenses / transactionDays;

        // Get category-wise breakdown
        const categoryQuery = `
            SELECT 
                c.name as category,
                SUM(t.amount) as total_amount,
                COUNT(t.id) as transaction_count
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1 
            AND t.type = 'DEBIT'
            AND t.transaction_date BETWEEN $2 AND $3
            GROUP BY c.name
            ORDER BY total_amount DESC
        `;

        const categoryResult = await pool.query(categoryQuery, [userId, start, end]);

        // Calculate percentages
        const categoryBreakdown = categoryResult.rows.map(cat => ({
            category: cat.category || 'Uncategorized',
            amount: parseFloat(cat.total_amount),
            count: parseInt(cat.transaction_count),
            percentage: totalExpenses > 0 ? ((parseFloat(cat.total_amount) / totalExpenses) * 100).toFixed(1) : 0
        }));

        // Get top 5 categories
        const topCategories = categoryBreakdown.slice(0, 5);

        // Get most spent category
        const mostSpentCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

        // Get daily spending pattern for the entire month
        const dailyQuery = `
            SELECT 
                DATE(transaction_date) as date,
                SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as daily_expenses,
                SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as daily_income
            FROM transactions
            WHERE user_id = $1 
            AND transaction_date BETWEEN $2 AND $3
            GROUP BY DATE(transaction_date)
            ORDER BY date ASC
        `;

        const dailyResult = await pool.query(dailyQuery, [userId, start, end]);

        // Fill in all days of the month (even days with no transactions)
        const dailySpending = [];
        const startDay = new Date(start);
        const endDay = new Date(end);

        // Create a map of existing data
        const dataMap = new Map();
        dailyResult.rows.forEach(row => {
            const dateKey = new Date(row.date).getDate();
            dataMap.set(dateKey, {
                expense: parseFloat(row.daily_expenses || 0),
                income: parseFloat(row.daily_income || 0)
            });
        });

        // Fill all days in the month
        for (let day = 1; day <= endDay.getDate(); day++) {
            const data = dataMap.get(day) || { expense: 0, income: 0 };
            dailySpending.push({
                day,
                expense: data.expense,
                income: data.income
            });
        }

        // Keep legacy dailyPattern for backward compatibility (last 7 days with data)
        const dailyPattern = dailyResult.rows.slice(-7).map(day => ({
            date: day.date,
            expenses: parseFloat(day.daily_expenses || 0),
            income: parseFloat(day.daily_income || 0)
        })).reverse();

        res.json({
            period: {
                start: start.toISOString(),
                end: end.toISOString(),
                days: transactionDays
            },
            summary: {
                totalIncome,
                totalExpenses,
                savings,
                avgDailySpending,
                incomeCount: parseInt(totals.income_count),
                expenseCount: parseInt(totals.expense_count),
                totalTransactions: parseInt(totals.income_count) + parseInt(totals.expense_count)
            },
            mostSpentCategory,
            categoryBreakdown,
            topCategories,
            dailyPattern,  // Legacy: last 7 days
            dailySpending  // New: full month day-by-day
        });

    } catch (error) {
        console.error('Analytics stats error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

export default router;
