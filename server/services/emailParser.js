class EmailParser {
    // Parse HDFC Bank transaction emails
    // Format: "Dear Customer, Rs. 1234.00 has been debited from account xyz to VPA gpay-xxx@okbizaxis on 09-01-26."
    parseHDFC(emailData) {
        try {
            const { subject, body, receivedAt } = emailData;

            console.log('=== PARSING HDFC EMAIL ===');
            console.log('Subject:', subject);
            console.log('Body preview:', body.substring(0, 300));
            console.log('Email received at:', receivedAt);

            const patterns = {
                // Match: Rs. 123.00 or Rs. 1,234.56
                amount: /Rs\.\s*([\d,]+\.?\d*)/i,
                // Match: debited or credited
                type: /(debited|credited)/i,
                // Match: account followed by masked number or name
                account: /account\s+([A-Z0-9*]+)/i,
                // Match: to VPA xxx or to Account xxx or just "to xxx"
                recipient: /to\s+(?:VPA\s+)?([^\s]+(?:@[^\s]+)?|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
                // Match: Avl Bal or Available balance
                balance: /(?:Avl\s+Bal|Available\s+balance)[:\s]*Rs\.?\s*([\d,]+\.?\d*)/i
            };

            const transaction = {
                bank: 'HDFC Bank',
                amount: null,
                type: null,
                accountNumber: null,
                date: receivedAt, // Use email received time as transaction time!
                balance: null,
                description: '',
                merchant: null,
                rawBody: body
            };

            // Extract amount
            const amountMatch = body.match(patterns.amount) || subject.match(patterns.amount);
            if (amountMatch) {
                transaction.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                console.log('✓ Amount:', transaction.amount);
            } else {
                console.log('✗ Amount not found');
            }

            // Extract type
            const typeMatch = body.match(patterns.type) || subject.match(patterns.type);
            if (typeMatch) {
                transaction.type = typeMatch[1].toLowerCase() === 'debited' ? 'DEBIT' : 'CREDIT';
                console.log('✓ Type:', transaction.type);
            } else {
                console.log('✗ Type not found');
            }

            // Extract account number
            const accountMatch = body.match(patterns.account) || subject.match(patterns.account);
            if (accountMatch) {
                transaction.accountNumber = accountMatch[1];
                console.log('✓ Account:', transaction.accountNumber);
            } else {
                console.log('✗ Account not found');
            }

            // Extract recipient/merchant
            const recipientMatch = body.match(patterns.recipient);
            if (recipientMatch) {
                transaction.merchant = recipientMatch[1];
                transaction.description = `${transaction.type === 'DEBIT' ? 'Payment to' : 'Payment from'} ${recipientMatch[1]}`;
                console.log('✓ Merchant:', transaction.merchant);
            } else {
                transaction.description = subject || 'HDFC Transaction';
                console.log('✗ Merchant not found, using subject');
            }

            // Extract balance
            const balanceMatch = body.match(patterns.balance);
            if (balanceMatch) {
                transaction.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
                console.log('✓ Balance:', transaction.balance);
            }

            console.log('✓ Transaction Date (from email arrival):', transaction.date);

            // Check if we have minimum required fields
            if (!transaction.amount || !transaction.type) {
                const missingFields = [];
                if (!transaction.amount) missingFields.push('amount');
                if (!transaction.type) missingFields.push('type');
                const errorMsg = `Missing required fields: ${missingFields.join(', ')}. Body preview: ${body.substring(0, 200)}`;
                console.log('✗ PARSING FAILED -', errorMsg);

                // Return error details instead of null for better debugging
                return {
                    error: true,
                    errorMessage: errorMsg,
                    subject,
                    bodyPreview: body.substring(0, 500)
                };
            }

            console.log('✓ PARSING SUCCESS');
            return transaction;
        } catch (error) {
            console.error('Error parsing HDFC email:', error);
            return {
                error: true,
                errorMessage: `Exception: ${error.message}`,
                subject: emailData.subject,
                bodyPreview: emailData.body?.substring(0, 500) || ''
            };
        }
    }

    // Main parse function - only HDFC for now
    parseEmail(emailData) {
        const { from } = emailData;

        if (!from) return null;

        const fromLower = from.toLowerCase();

        if (fromLower.includes('hdfc')) {
            return this.parseHDFC(emailData);
        }

        console.log('Unknown bank email from:', from);
        return null;
    }

    // Categorize transaction based on description
    categorizeTransaction(description) {
        if (!description) return 'Uncategorized';

        const desc = description.toLowerCase();

        // Investment
        if (desc.includes('groww') || desc.includes('zerodha') ||
            desc.includes('mutual fund') || desc.includes('investment') ||
            desc.includes('stock') || desc.includes('sip')) {
            return 'Investment';
        }

        // Rent
        if (desc.includes('rentok') || desc.includes('rent') ||
            desc.includes('rental') || desc.includes('landlord')) {
            return 'Rent';
        }

        // Credit Card Bill
        if (desc.includes('cred') || desc.includes('credit card') ||
            desc.includes('cc bill') || desc.includes('card payment')) {
            return 'Credit Card Bill';
        }

        // Food & Dining
        if (desc.includes('swiggy') || desc.includes('zomato') ||
            desc.includes('food') || desc.includes('restaurant') ||
            desc.includes('cafe') || desc.includes('pizza') ||
            desc.includes('burger') || desc.includes('dominos')) {
            return 'Food & Dining';
        }

        // Digital Payments & UPI
        if (desc.includes('gpay') || desc.includes('phonepe') ||
            desc.includes('paytm') || desc.includes('upi') ||
            desc.includes('@') || desc.includes('ybl') ||
            desc.includes('okaxis') || desc.includes('payu')) {
            return 'Digital Payments';
        }

        // Shopping
        if (desc.includes('amazon') || desc.includes('flipkart') ||
            desc.includes('myntra') || desc.includes('shop') ||
            desc.includes('store') || desc.includes('purchase')) {
            return 'Shopping';
        }

        // Transportation
        if (desc.includes('uber') || desc.includes('ola') ||
            desc.includes('rapido') || desc.includes('petrol') ||
            desc.includes('fuel') || desc.includes('metro') ||
            desc.includes('bus') || desc.includes('taxi')) {
            return 'Transportation';
        }

        // Entertainment
        if (desc.includes('netflix') || desc.includes('spotify') ||
            desc.includes('prime') || desc.includes('hotstar') ||
            desc.includes('movie') || desc.includes('game')) {
            return 'Entertainment';
        }

        // Bills & Utilities
        if (desc.includes('electricity') || desc.includes('water') ||
            desc.includes('gas') || desc.includes('broadband') ||
            desc.includes('mobile') || desc.includes('recharge') ||
            desc.includes('bill') || desc.includes('jio') ||
            desc.includes('airtel') || desc.includes('vi')) {
            return 'Bills & Utilities';
        }

        // Healthcare
        if (desc.includes('hospital') || desc.includes('doctor') ||
            desc.includes('medical') || desc.includes('pharmacy') ||
            desc.includes('medicine') || desc.includes('health')) {
            return 'Healthcare';
        }

        // Salary/Income
        if (desc.includes('salary') || desc.includes('credited') ||
            desc.includes('income') || desc.includes('payment received')) {
            return 'Salary';
        }

        return 'Uncategorized';
    }
}

export default new EmailParser();
