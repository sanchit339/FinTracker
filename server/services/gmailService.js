import { google } from 'googleapis';
import gmailConfig from '../config/gmail.js';
import pool from '../config/database.js';

class GmailService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            gmailConfig.clientId,
            gmailConfig.clientSecret,
            gmailConfig.redirectUri
        );
    }

    // Generate OAuth URL for user authorization
    getAuthUrl() {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: gmailConfig.scopes,
            prompt: 'consent'
        });
    }

    // Exchange authorization code for tokens
    async getTokensFromCode(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            return tokens;
        } catch (error) {
            console.error('Error getting tokens from code:', error);
            throw new Error('Failed to exchange authorization code');
        }
    }

    // Set refresh token for user
    setRefreshToken(refreshToken) {
        this.oauth2Client.setCredentials({
            refresh_token: refreshToken
        });
    }

    // Get Gmail API client
    getGmailClient() {
        return google.gmail({ version: 'v1', auth: this.oauth2Client });
    }

    // Fetch emails since a specific date
    async fetchEmailsSince(userId, sinceDate, maxResults = 500) {
        try {
            const gmail = this.getGmailClient();

            // Format date for Gmail search: YYYY/MM/DD
            // Subtract 1 day from sinceDate to ensure we include the start date itself
            const adjustedDate = new Date(sinceDate);
            adjustedDate.setDate(adjustedDate.getDate() - 1);
            const dateStr = adjustedDate.toISOString().split('T')[0].replace(/-/g, '/');

            // Build query from configured HDFC sender filters.
            // Keep subject open because HDFC templates/subjects vary and strict subject filters skip valid transactions.
            // 'after:' excludes the specified date, so we subtract 1 day above to include our target date.
            const hdfcFilters = gmailConfig.bankEmailFilters?.['HDFC Bank'] || {};
            const fromList = Array.isArray(hdfcFilters.from) ? hdfcFilters.from.filter(Boolean) : [];

            const senderClauses = [...fromList.map(sender => `from:${sender}`), 'from:hdfc'];
            const fromQuery = `(${[...new Set(senderClauses)].join(' OR ')})`;

            const query = `${fromQuery} after:${dateStr}`;
            console.log('Gmail search query:', query);

            // List messages
            const response = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: maxResults
            });

            const messages = response.data.messages || [];
            console.log(`Found ${messages.length} HDFC UPI transaction emails since ${dateStr}`);

            if (messages.length === 0) {
                return [];
            }

            // Fetch full message details in parallel
            const emailPromises = messages.map(msg =>
                gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id,
                    format: 'full'
                })
            );

            const fullMessages = await Promise.all(emailPromises);
            return fullMessages.map(m => m.data);

        } catch (error) {
            console.error('Error fetching emails since date:', error);
            throw new Error('Failed to fetch emails from Gmail');
        }
    }

    // Fetch emails with filters (legacy method)
    async fetchEmails(userId, maxResults = 50) {
        try {
            // Get user's refresh token
            const userResult = await pool.query(
                'SELECT gmail_email FROM users WHERE id = $1',
                [userId]
            );

            if (!userResult.rows[0]?.gmail_email) {
                throw new Error('Gmail not connected for this user');
            }

            const gmail = this.getGmailClient();

            // Build query for bank transaction emails
            const bankQueries = [];
            for (const [bank, filters] of Object.entries(gmailConfig.bankEmailFilters)) {
                const fromQuery = filters.from.map(f => `from:${f}`).join(' OR ');
                const subjectQuery = filters.subject.map(s => `subject:${s}`).join(' OR ');
                bankQueries.push(`(${fromQuery}) AND (${subjectQuery})`);
            }

            const query = bankQueries.join(' OR ');

            // List messages
            const response = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: maxResults
            });

            const messages = response.data.messages || [];
            console.log(`Found ${messages.length} transaction emails`);

            // Fetch full message details
            const emailPromises = messages.map(msg =>
                gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id,
                    format: 'full'
                })
            );

            const fullMessages = await Promise.all(emailPromises);
            return fullMessages.map(m => m.data);

        } catch (error) {
            console.error('Error fetching emails:', error);
            throw new Error('Failed to fetch emails from Gmail');
        }
    }

    // Get label list (for debugging/setup)
    async getLabels(userId) {
        try {
            const gmail = this.getGmailClient();
            const response = await gmail.users.labels.list({
                userId: 'me'
            });
            return response.data.labels;
        } catch (error) {
            console.error('Error getting labels:', error);
            throw error;
        }
    }

    // Set up push notifications (webhook)
    async setupPushNotifications(userId, topicName) {
        try {
            const gmail = this.getGmailClient();
            const response = await gmail.users.watch({
                userId: 'me',
                requestBody: {
                    topicName: topicName,
                    labelIds: ['INBOX']
                }
            });

            // Store history ID for future syncs
            await pool.query(
                'INSERT INTO gmail_sync_state (user_id, last_history_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET last_history_id = $2',
                [userId, response.data.historyId]
            );

            console.log('Push notifications setup:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error setting up push notifications:', error);
            throw error;
        }
    }

    // Extract email data from Gmail message
    extractEmailData(message) {
        try {
            const headers = message.payload.headers;
            const subject = headers.find(h => h.name === 'Subject')?.value || '';
            const from = headers.find(h => h.name === 'From')?.value || '';
            const dateHeader = headers.find(h => h.name === 'Date')?.value || '';

            // Get email received time from Gmail (internalDate is in milliseconds)
            // This is the actual time when Gmail received the email - most accurate!
            const receivedTime = message.internalDate ? new Date(parseInt(message.internalDate)) : new Date(dateHeader);

            // Extract body - Gmail API returns base64url encoded data
            let body = '';

            // Try to get body from different possible locations
            if (message.payload.body && message.payload.body.data) {
                // Body is directly in payload
                body = Buffer.from(message.payload.body.data, 'base64url').toString('utf-8');
            } else if (message.payload.parts) {
                // Body is in parts (multipart email)
                for (const part of message.payload.parts) {
                    // Look for text/plain or text/html
                    if (part.mimeType === 'text/plain' && part.body?.data) {
                        body = Buffer.from(part.body.data, 'base64url').toString('utf-8');
                        break;
                    } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
                        // Use HTML as fallback, strip tags properly
                        const htmlBody = Buffer.from(part.body.data, 'base64url').toString('utf-8');
                        body = this.extractTextFromHTML(htmlBody);
                    } else if (part.parts) {
                        // Nested parts (like multipart/alternative)
                        for (const nestedPart of part.parts) {
                            if (nestedPart.mimeType === 'text/plain' && nestedPart.body?.data) {
                                body = Buffer.from(nestedPart.body.data, 'base64url').toString('utf-8');
                                break;
                            } else if (nestedPart.mimeType === 'text/html' && nestedPart.body?.data && !body) {
                                const htmlBody = Buffer.from(nestedPart.body.data, 'base64url').toString('utf-8');
                                body = this.extractTextFromHTML(htmlBody);
                            }
                        }
                        if (body) break;
                    }
                }
            }

            console.log(`📧 Extracted email - Subject: "${subject}", Body length: ${body.length}, Received: ${receivedTime.toISOString()}`);

            return {
                id: message.id,
                subject,
                from,
                date: dateHeader,
                receivedAt: receivedTime, // Actual time when Gmail received the email
                body: body.trim()
            };
        } catch (error) {
            console.error('Error extracting email data:', error);
            return null;
        }
    }

    // Helper to extract text from HTML emails
    extractTextFromHTML(html) {
        let text = html;

        // Remove style blocks
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

        // Remove script blocks
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

        // Remove HTML comments
        text = text.replace(/<!--[\s\S]*?-->/g, '');

        // Remove all remaining HTML tags
        text = text.replace(/<[^>]+>/g, ' ');

        // Decode HTML entities
        text = text.replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    }
}

export default new GmailService();
