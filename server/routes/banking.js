import express from 'express';
import authenticateToken from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

// Get recent transactions across all accounts with pagination
router.get('/transactions/recent', async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            limit = 20,
            offset = 0,
            startDate,
            endDate,
            type,  // DEBIT or CREDIT
            search // Search term
        } = req.query;

        let query = `
            SELECT t.*, 
                   c.name as category_name, 
                   a.bank_name,
                   a.account_number_masked
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN accounts a ON t.account_id = a.id
            WHERE t.user_id = $1
        `;

        const params = [userId];
        let paramCount = 1;

        // Add date filters if provided
        if (startDate) {
            paramCount++;
            query += ` AND t.transaction_date >= $${paramCount}`;
            params.push(startDate);
        }

        if (endDate) {
            paramCount++;
            query += ` AND t.transaction_date <= $${paramCount}`;
            params.push(endDate);
        }

        // Add type filter if provided
        if (type && (type === 'DEBIT' || type === 'CREDIT')) {
            paramCount++;
            query += ` AND t.type = $${paramCount}`;
            params.push(type);
        }

        // Add search filter if provided
        if (search) {
            paramCount++;
            query += ` AND (t.description ILIKE $${paramCount} OR c.name ILIKE $${paramCount} OR a.bank_name ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as count
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN accounts a ON t.account_id = a.id
            WHERE t.user_id = $1
        `;

        let countParamCount = 1;
        const countParams = [userId];

        if (startDate) {
            countParamCount++;
            countQuery += ` AND t.transaction_date >= $${countParamCount}`;
            countParams.push(startDate);
        }

        if (endDate) {
            countParamCount++;
            countQuery += ` AND t.transaction_date <= $${countParamCount}`;
            countParams.push(endDate);
        }

        if (type && (type === 'DEBIT' || type === 'CREDIT')) {
            countParamCount++;
            countQuery += ` AND t.type = $${countParamCount}`;
            countParams.push(type);
        }

        if (search) {
            countParamCount++;
            countQuery += ` AND (t.description ILIKE $${countParamCount} OR c.name ILIKE $${countParamCount} OR a.bank_name ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0]?.count || 0);

        // Add sorting, limit and offset
        query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        res.json({
            transactions: result.rows,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
            }
        });
    } catch (error) {
        console.error('Get recent transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch recent transactions' });
    }
});


// List linked accounts
router.get('/accounts', async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            'SELECT * FROM linked_accounts WHERE user_id = $1 AND is_active = true ORDER BY linked_at DESC',
            [userId]
        );

        res.json({ accounts: result.rows });
    } catch (error) {
        console.error('List accounts error:', error);
        res.status(500).json({ error: 'Failed to list accounts' });
    }
});

// Link a bank account (for testing - manual link)
router.post('/accounts/link', async (req, res) => {
    try {
        const { bankName, accountType, consentId } = req.body;
        const userId = req.user.userId;

        // Generate mock account ID
        const accountId = `acc_${bankName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

        const result = await pool.query(
            `INSERT INTO linked_accounts (user_id, consent_id, account_id, fip_id, bank_name, account_type, masked_account_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [userId, consentId || null, accountId, bankName, bankName, accountType || 'SAVINGS', `****${Math.floor(Math.random() * 10000)}`]
        );

        res.json({
            message: 'Account linked successfully',
            account: result.rows[0]
        });
    } catch (error) {
        console.error('Link account error:', error);
        res.status(500).json({ error: 'Failed to link account' });
    }
});

// Get available categories (system + user's custom categories if any)
router.get('/categories', async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query(
            `SELECT DISTINCT ON (name) id, name, color, icon, is_system 
             FROM categories 
             WHERE user_id = $1 OR is_system = true 
             ORDER BY name ASC, is_system ASC`,
            [userId]
        );
        res.json({ categories: result.rows });
    } catch (error) {
        console.error('Fetch categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Update transaction category
router.put('/transactions/:id/category', async (req, res) => {
    try {
        const { id } = req.params;
        const { categoryId } = req.body;
        const userId = req.user.userId;

        // Verify the transaction belongs to the user
        const txCheck = await pool.query(
            'SELECT id FROM transactions WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (txCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found or unauthorized' });
        }

        // Verify the category is valid (system or belongs to user)
        if (categoryId !== null) {
            const catCheck = await pool.query(
                'SELECT id FROM categories WHERE id = $1 AND (user_id = $2 OR is_system = true)',
                [categoryId, userId]
            );

            if (catCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid category' });
            }
        }

        // Update the category
        const result = await pool.query(
            `UPDATE transactions 
             SET category_id = $1 
             WHERE id = $2 AND user_id = $3 
             RETURNING id, category_id`,
            [categoryId, id, userId]
        );

        res.json({ 
            message: 'Category updated successfully',
            transaction: result.rows[0]
        });
    } catch (error) {
        console.error('Update transaction category error:', error);
        res.status(500).json({ error: 'Failed to update transaction category' });
    }
});

export default router;
