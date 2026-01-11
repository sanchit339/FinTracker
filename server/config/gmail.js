import dotenv from 'dotenv';

dotenv.config();

export const gmailConfig = {
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    redirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback',
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,

    // Gmail API scopes
    scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
    ],

    // Email filters for bank transactions
    bankEmailFilters: {
        'HDFC Bank': {
            from: ['alerts@hdfcbank.net'],
            subject: [] // Match all subjects from this sender
        }
    },

    // Sync settings
    syncIntervalMinutes: 10, // Poll every 10 minutes
    maxEmailsPerSync: 50,
    lookbackDays: 90 // Only sync emails from last 90 days on first sync
};

export default gmailConfig;
