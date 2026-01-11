import { useState } from 'react';
import './BankCard.css';

function BankCard({ account }) {
    const [showBalance, setShowBalance] = useState(false);
    const [showTransactions, setShowTransactions] = useState(false);
    const [balance, setBalance] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchBalance = async () => {
        if (showBalance) {
            setShowBalance(false);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/banking/balance/${account.account_id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch balance');

            const data = await response.json();
            setBalance(data);
            setShowBalance(true);
        } catch (error) {
            console.error('Fetch balance error:', error);
            alert('Failed to fetch balance');
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        if (showTransactions) {
            setShowTransactions(false);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/banking/transactions/${account.account_id}?limit=5`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch transactions');

            const data = await response.json();
            setTransactions(data.transactions || []);
            setShowTransactions(true);
        } catch (error) {
            console.error('Fetch transactions error:', error);
            alert('Failed to fetch transactions');
        } finally {
            setLoading(false);
        }
    };

    const getBankIcon = (bankName) => {
        // Return bank-specific colors
        const colors = {
            'HDFC Bank': 'linear-gradient(135deg, #004C8F 0%, #0066CC 100%)',
            'Union Bank of India': 'linear-gradient(135deg, #E31E24 0%, #FF6B6B 100%)',
            'Indian Overseas Bank': 'linear-gradient(135deg, #FF6600 0%, #FF9933 100%)'
        };
        return colors[bankName] || 'var(--gradient-primary)';
    };

    return (
        <div className="bank-card glass-card">
            <div className="bank-header">
                <div className="bank-icon" style={{ background: getBankIcon(account.bank_name) }}>
                    <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                    </svg>
                </div>
                <div className="bank-info">
                    <h3>{account.bank_name}</h3>
                    <p className="account-number">{account.masked_account_number || '****1234'}</p>
                    <span className="account-type-badge">{account.account_type}</span>
                </div>
            </div>

            <div className="bank-actions">
                <button
                    onClick={fetchBalance}
                    className="btn btn-accent btn-sm"
                    disabled={loading}
                >
                    {loading && !showTransactions ? (
                        <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    ) : (
                        showBalance ? 'Hide Balance' : 'Check Balance'
                    )}
                </button>
                <button
                    onClick={fetchTransactions}
                    className="btn btn-secondary btn-sm"
                    disabled={loading}
                >
                    {loading && !showBalance ? (
                        <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    ) : (
                        showTransactions ? 'Hide Transactions' : 'View Transactions'
                    )}
                </button>
            </div>

            {showBalance && balance && (
                <div className="balance-display">
                    <div className="balance-label">Available Balance</div>
                    <div className="balance-amount">
                        ₹{balance.balance.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="balance-updated">
                        Last updated: {new Date(balance.lastUpdated).toLocaleString()}
                    </div>
                </div>
            )}

            {showTransactions && transactions.length > 0 && (
                <div className="transactions-list">
                    <h4>Last 5 Transactions</h4>
                    {transactions.map((txn, index) => (
                        <div key={index} className="transaction-item">
                            <div className="transaction-info">
                                <div className="transaction-description">{txn.description}</div>
                                <div className="transaction-date">
                                    {new Date(txn.date).toLocaleDateString()}
                                </div>
                            </div>
                            <div className={`transaction-amount ${txn.type === 'CREDIT' ? 'credit' : 'debit'}`}>
                                {txn.type === 'CREDIT' ? '+' : '-'}₹{Math.abs(txn.amount).toLocaleString('en-IN')}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default BankCard;
