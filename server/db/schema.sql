-- Financial Portfolio Tracker Database Schema

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    gmail_email VARCHAR(255), -- Connected Gmail account
    gmail_refresh_token TEXT, -- Encrypted refresh token
    last_gmail_sync TIMESTAMP, -- Last time Gmail was synced
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank accounts
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL, -- HDFC Bank, Union Bank, IOB
    account_type VARCHAR(50), -- SAVINGS, CURRENT
    account_number_masked VARCHAR(50),
    current_balance DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Transaction categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(50), -- Icon name/emoji
    is_system BOOLEAN DEFAULT FALSE, -- System category or user-created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions (parsed from emails or manual entry)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL, -- DEBIT, CREDIT
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    description TEXT,
    merchant VARCHAR(255),
    balance_after DECIMAL(15, 2), -- Balance after transaction
    transaction_date TIMESTAMP NOT NULL,
    email_id VARCHAR(255), -- Gmail message ID (if from email)
    is_manual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    period VARCHAR(20) NOT NULL, -- MONTHLY, WEEKLY, YEARLY
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investments (manual entry for now)
CREATE TABLE IF NOT EXISTS investments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- Stock name, mutual fund
    type VARCHAR(50), -- STOCK, MUTUAL_FUND, BOND, etc.
    quantity DECIMAL(15, 4),
    purchase_price DECIMAL(15, 2),
    current_price DECIMAL(15, 2),
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gmail sync state
CREATE TABLE IF NOT EXISTS gmail_sync_state (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    last_history_id VARCHAR(255),
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(50), -- SUCCESS, FAILED, IN_PROGRESS
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email parsing errors (for debugging)
CREATE TABLE IF NOT EXISTS email_parsing_errors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email_id VARCHAR(255) NOT NULL,
    email_subject TEXT,
    email_from VARCHAR(255),
    email_body TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);

-- Insert default categories
INSERT INTO categories (user_id, name, color, icon, is_system) VALUES
(NULL, 'Food & Dining', '#EF4444', '🍔', TRUE),
(NULL, 'Transportation', '#3B82F6', '🚗', TRUE),
(NULL, 'Shopping', '#8B5CF6', '🛍️', TRUE),
(NULL, 'Bills & Utilities', '#F59E0B', '💡', TRUE),
(NULL, 'Entertainment', '#EC4899', '🎬', TRUE),
(NULL, 'Healthcare', '#10B981', '⚕️', TRUE),
(NULL, 'Salary', '#22C55E', '💰', TRUE),
(NULL, 'Other Income', '#14B8A6', '💵', TRUE),
(NULL, 'Investments', '#6366F1', '📈', TRUE),
(NULL, 'Uncategorized', '#6B7280', '❓', TRUE)
ON CONFLICT DO NOTHING;

-- Insert demo user with password 'demo1234'
INSERT INTO users (username, email, password_hash)
VALUES ('demo', 'demo@portfoliio.com', '$2b$10$YKwu8N.EYk2nIx2uZqL0OeBsz0k0lHt3t.y6nCNqK6QXqOwZm4K1S')
ON CONFLICT (username) DO NOTHING;
