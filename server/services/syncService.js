import pool from '../config/database.js';
import gmailService from './gmailService.js';
import emailParser from './emailParser.js';

class SyncService {
    /**
     * Sync Gmail emails for a user
     * @param {number} userId - User ID
     * @returns {Promise<Object>} Sync results
     */
    async syncGmailForUser(userId) {
        try {
            // Get user's refresh token and last sync time
            const userResult = await pool.query(
                'SELECT gmail_refresh_token, last_gmail_sync FROM users WHERE id = $1',
                [userId]
            );

            const refreshToken = userResult.rows[0]?.gmail_refresh_token;
            const lastSync = userResult.rows[0]?.last_gmail_sync;

            if (!refreshToken) {
                throw new Error('Gmail not connected');
            }

            // Set refresh token for this session
            gmailService.setRefreshToken(refreshToken);

            // Determine date filter for incremental sync
            let searchAfterDate;
            let isFirstSync = false;

            if (lastSync) {
                // Incremental sync: Fetch only NEW emails since last sync
                searchAfterDate = new Date(lastSync);
                console.log(`📥 Incremental sync - fetching emails since: ${searchAfterDate.toISOString()}`);
            } else {
                // First sync: Fetch all emails from last 3 months to ensure we get everything
                const now = new Date();
                searchAfterDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                isFirstSync = true;
                console.log(`🆕 First sync - fetching all emails from: ${searchAfterDate.toISOString()}`);
            }

            // Fetch emails from the determined date
            const emails = await gmailService.fetchEmailsSince(userId, searchAfterDate);
            console.log(`📧 Found ${emails.length} new HDFC emails`);

            // Parse and store transactions
            const results = await this.processEmails(emails, userId);

            // Update last sync time to NOW (important for incremental sync)
            const syncTime = new Date();
            await pool.query(
                'UPDATE users SET last_gmail_sync = $1 WHERE id = $2',
                [syncTime, userId]
            );

            await pool.query(
                `INSERT INTO gmail_sync_state (user_id, last_sync_at, sync_status) 
                 VALUES ($1, $2, 'SUCCESS') 
                 ON CONFLICT (user_id) DO UPDATE SET last_sync_at = $2, sync_status = 'SUCCESS'`,
                [userId, syncTime]
            );

            console.log(`✅ Sync completed. Last sync time updated to: ${syncTime.toISOString()}`);

            return {
                success: true,
                emailsProcessed: emails.length,
                transactionsAdded: results.transactionsAdded,
                accountsCreated: results.accountsCreated,
                isFirstSync: isFirstSync,
                lastSyncTime: syncTime.toISOString(),
                errors: results.errors.length > 0 ? results.errors : undefined
            };

        } catch (error) {
            console.error('Sync error:', error);

            // Update sync state with error
            try {
                await pool.query(
                    `INSERT INTO gmail_sync_state (user_id, last_sync_at, sync_status, error_message) 
                     VALUES ($1, NOW(), 'FAILED', $2) 
                     ON CONFLICT (user_id) DO UPDATE SET last_sync_at = NOW(), sync_status = 'FAILED', error_message = $2`,
                    [userId, error.message]
                );
            } catch (e) {
                console.error('Failed to update sync state:', e);
            }

            throw error;
        }
    }

    /**
     * Process emails and extract transactions
     * @param {Array} emails - Array of email objects from Gmail API
     * @param {number} userId - User ID
     * @returns {Promise<Object>} Processing results
     */
    async processEmails(emails, userId) {
        let transactionsAdded = 0;
        let accountsCreated = 0;
        const errors = [];

        for (const email of emails) {
            try {
                const emailData = gmailService.extractEmailData(email);
                if (!emailData) continue;

                const transaction = emailParser.parseEmail(emailData);
                if (!transaction) {
                    // Log parsing error
                    await this.logParsingError(userId, emailData, 'Failed to parse transaction');
                    continue;
                }

                // Find or create account
                const accountId = await this.findOrCreateAccount(userId, transaction);
                if (accountId && !transaction.accountId) {
                    accountsCreated++;
                }

                // Get category ID
                const categoryId = await this.getCategoryId(transaction.description, userId);

                // Check if transaction already exists
                const exists = await this.transactionExists(emailData.id);
                if (exists) {
                    console.log(`Transaction already exists for email ${emailData.id}`);
                    continue;
                }

                // Insert transaction
                await this.insertTransaction(userId, accountId, categoryId, transaction, emailData.id);
                transactionsAdded++;

            } catch (err) {
                console.error('Error processing email:', err);
                errors.push(err.message);
            }
        }

        return { transactionsAdded, accountsCreated, errors };
    }

    /**
     * Find or create bank account
     */
    async findOrCreateAccount(userId, transaction) {
        const accountResult = await pool.query(
            'SELECT id FROM accounts WHERE user_id = $1 AND bank_name = $2 AND account_number_masked = $3',
            [userId, transaction.bank, transaction.accountNumber]
        );

        if (accountResult.rows.length > 0) {
            const accountId = accountResult.rows[0].id;

            // Update balance if available
            if (transaction.balance) {
                await pool.query(
                    'UPDATE accounts SET current_balance = $1, updated_at = NOW() WHERE id = $2',
                    [transaction.balance, accountId]
                );
            }

            return accountId;
        }

        // Create new account
        const newAccount = await pool.query(
            'INSERT INTO accounts (user_id, bank_name, account_number_masked, current_balance) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, transaction.bank, transaction.accountNumber, transaction.balance || 0]
        );

        return newAccount.rows[0].id;
    }

    /**
     * Get category ID for a transaction
     */
    async getCategoryId(description, userId) {
        const categoryName = emailParser.categorizeTransaction(description);
        const categoryResult = await pool.query(
            'SELECT id FROM categories WHERE name = $1 AND (user_id IS NULL OR user_id = $2) LIMIT 1',
            [categoryName, userId]
        );
        return categoryResult.rows[0]?.id || null;
    }

    /**
     * Check if transaction already exists
     */
    async transactionExists(emailId) {
        const result = await pool.query(
            'SELECT id FROM transactions WHERE email_id = $1',
            [emailId]
        );
        return result.rows.length > 0;
    }

    /**
     * Insert transaction into database
     */
    async insertTransaction(userId, accountId, categoryId, transaction, emailId) {
        await pool.query(
            `INSERT INTO transactions 
            (user_id, account_id, category_id, type, amount, description, balance_after, transaction_date, email_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                userId,
                accountId,
                categoryId,
                transaction.type,
                transaction.amount,
                transaction.description,
                transaction.balance,
                transaction.date || new Date(),
                emailId
            ]
        );
    }

    /**
     * Log email parsing error
     */
    async logParsingError(userId, emailData, errorMessage) {
        await pool.query(
            'INSERT INTO email_parsing_errors (user_id, email_id, email_subject, email_from, email_body, error_message) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, emailData.id, emailData.subject, emailData.from, emailData.body.substring(0, 500), errorMessage]
        );
    }

    /**
     * Get sync status for a user
     */
    async getSyncStatus(userId) {
        const result = await pool.query(
            'SELECT last_sync_at, sync_status, error_message FROM gmail_sync_state WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return { synced: false };
        }

        return {
            synced: true,
            lastSyncAt: result.rows[0].last_sync_at,
            status: result.rows[0].sync_status,
            error: result.rows[0].error_message
        };
    }
}

export default new SyncService();
