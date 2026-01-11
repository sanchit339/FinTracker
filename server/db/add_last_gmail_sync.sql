-- Add missing last_gmail_sync column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_gmail_sync TIMESTAMP;
