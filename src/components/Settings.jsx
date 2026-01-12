import { useState, useEffect } from 'react';

function Settings() {
    const [gmailStatus, setGmailStatus] = useState({ connected: false, email: null, loading: true });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showSetupGuide, setShowSetupGuide] = useState(false);

    useEffect(() => {
        checkGmailStatus();
    }, []);

    const checkGmailStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setGmailStatus({ connected: false, email: null, loading: false });
                return;
            }

            const response = await fetch('/api/gmail/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to check status');
            }

            const data = await response.json();
            console.log('Gmail status:', data);
            setGmailStatus({ ...data, loading: false });
        } catch (error) {
            console.error('Error checking Gmail status:', error);
            setGmailStatus({ connected: false, email: null, loading: false });
        }
    };

    const connectGmail = async () => {
        try {
            setLoading(true);
            setMessage('');
            const token = localStorage.getItem('token');
            const response = await fetch('/api/gmail/auth/url', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start authorization');
            }

            const data = await response.json();

            // Open OAuth URL in popup
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            const popup = window.open(
                data.authUrl,
                'Gmail Authorization',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            // Check if popup was blocked
            if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                throw new Error('Popup was blocked. Please allow popups for this site.');
            }

            // Poll for popup closure and check status
            const checkInterval = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkInterval);
                    setLoading(false);
                    setMessage('⏳ Checking connection status...');
                    // Wait a bit then check status
                    setTimeout(() => {
                        checkGmailStatus();
                    }, 2000);
                }
            }, 500);

        } catch (error) {
            console.error('Error connecting Gmail:', error);
            setMessage(`❌ ${error.message}`);
            if (error.message.includes('Enable it')) {
                setShowSetupGuide(true);
            }
            setLoading(false);
        }
    };

    const disconnectGmail = async () => {
        if (!confirm('Are you sure you want to disconnect Gmail? Your synced transactions will remain.')) return;

        try {
            setMessage('');
            const token = localStorage.getItem('token');
            const response = await fetch('/api/gmail/disconnect', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setMessage('✅ Gmail disconnected successfully');
                setGmailStatus({ connected: false, email: null, loading: false });
            } else {
                throw new Error('Failed to disconnect');
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
            setMessage('❌ Failed to disconnect Gmail');
        }
    };

    const syncGmail = async () => {
        try {
            setLoading(true);
            setMessage('🔄 Syncing new Gmail transactions...');
            const token = localStorage.getItem('token');
            const response = await fetch('/api/gmail/sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setMessage(`✅ Synced ${result.transactionsAdded} new transactions!`);
            } else {
                const error = await response.json();
                throw new Error(error.details || 'Failed to sync');
            }
        } catch (error) {
            console.error('Error syncing:', error);
            setMessage(`❌ ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const syncAll = async () => {
        if (!confirm('This will re-sync all emails from the start of this month. Continue?')) return;

        try {
            setLoading(true);
            setMessage('🔄 Syncing ALL transactions from this month...');
            const token = localStorage.getItem('token');
            const response = await fetch('/api/gmail/sync-all', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setMessage(`✅ Synced ${result.transactionsAdded} transactions from entire month!`);
            } else {
                const error = await response.json();
                throw new Error(error.details || 'Failed to sync all');
            }
        } catch (error) {
            console.error('Error syncing all:', error);
            setMessage(`❌ ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const resetSync = async () => {
        if (!confirm('⚠️ This will DELETE all synced transactions! Are you sure?')) return;

        try {
            setLoading(true);
            setMessage('🗑️ Resetting...');
            const token = localStorage.getItem('token');
            const response = await fetch('/api/gmail/reset', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setMessage(`✅ ${result.message}`);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to reset');
            }
        } catch (error) {
            console.error('Error resetting:', error);
            setMessage(`❌ ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (gmailStatus.loading) {
        return (
            <div className="dashboard-page">
                <div className="page-header">
                    <h1>Settings</h1>
                </div>
                <div className="page-loading">
                    <div className="spinner"></div>
                    <p className="text-muted mt-2">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <div className="header-content">
                    <h1>Settings</h1>
                    <p className="subtitle">Manage your account and preferences</p>
                </div>
            </div>

            {message && (
                <div className={`alert ${message.includes('✅') || message.includes('⏳') ? 'alert-success' : 'alert-error'}`}>
                    {message}
                </div>
            )}

            {showSetupGuide && (
                <div className="setup-guide card mb-3">
                    <div className="setup-guide-header">
                        <h3>⚙️ Gmail API Not Enabled</h3>
                        <button className="btn btn-sm btn-ghost" onClick={() => setShowSetupGuide(false)}>✕</button>
                    </div>
                    <div className="setup-steps">
                        <p className="text-secondary mb-2"><strong>Gmail API must be enabled in Google Cloud Console:</strong></p>
                        <ol>
                            <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
                            <li>Select your project (FinTrack)</li>
                            <li>Go to <strong>APIs & Services → Library</strong></li>
                            <li>Search for "Gmail API" and click <strong>Enable</strong></li>
                            <li>Wait 30 seconds, then try connecting again</li>
                        </ol>
                        <p className="text-sm text-muted mt-2">
                            📖 Full guide: <code>docs/GMAIL_SETUP.md</code>
                        </p>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="section-header">
                    <h3>Gmail Integration</h3>
                    {gmailStatus.connected && (
                        <span className="badge badge-success">✓ Connected</span>
                    )}
                </div>

                {gmailStatus.connected ? (
                    <div>
                        <div className="gmail-connected-info">
                            <div className="gmail-icon">✅</div>
                            <div>
                                <p className="text-lg mb-1">
                                    <strong>{gmailStatus.email}</strong>
                                </p>
                                <p className="text-sm text-muted mb-2">
                                    📧 Syncing from <code>alerts@hdfcbank.net</code>
                                </p>
                                <p className="text-xs text-muted">
                                    All transaction emails from this sender are automatically tracked
                                </p>
                            </div>
                        </div>
                        <div className="button-group mt-3" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" onClick={syncGmail} disabled={loading}>
                                {loading ? 'Syncing...' : '🔄 Sync Transactions'}
                            </button>
                            <button className="btn btn-secondary" onClick={disconnectGmail}>
                                Disconnect Gmail
                            </button>
                            <button
                                className="btn btn-ghost text-danger"
                                onClick={resetSync}
                                disabled={loading}
                                style={{ color: '#EF4444' }}
                            >
                                🗑️ Reset Data (Dev Only)
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📧</div>
                        <h4>Connect Gmail</h4>
                        <p className="text-secondary mb-3">
                            Automatically sync HDFC Bank transaction emails to track your spending
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={connectGmail}
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="btn-loading">
                                    <div className="spinner-sm"></div>
                                    <span>Connecting...</span>
                                </div>
                            ) : 'Connect Gmail Account'}
                        </button>
                        <button
                            className="btn btn-ghost btn-sm mt-2"
                            onClick={() => setShowSetupGuide(true)}
                        >
                            Having trouble? View setup guide
                        </button>
                        <p className="text-xs text-muted mt-3">
                            🔒 We only access <code>alerts@hdfcbank.net</code> emails
                        </p>
                    </div>
                )}
            </div>

            <div className="card mt-3">
                <div className="section-header">
                    <h3>Account Settings</h3>
                </div>
                <p className="text-secondary">More settings coming soon...</p>
            </div>

            <style>{`
                .dashboard-page {
                    padding: var(--spacing-xl);
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .page-header {
                    margin-bottom: var(--spacing-xl);
                }

                .header-content h1 {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0 0 0.25rem 0;
                }

                .subtitle {
                    color: var(--text-secondary);
                    font-size: var(--font-size-md);
                    margin: 0;
                }

                .alert {
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-lg);
          font-size: var(--font-size-sm);
          font-weight: 500;
        }
        .alert-success {
          background-color: #DCFCE7;
          color: #166534;
          border: 1px solid #BBF7D0;
        }
        .alert-error {
          background-color: #FEE2E2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }
        .setup-guide {
          background-color: #FEF3C7;
          border: 1px solid #FCD34D;
        }
        .setup-guide-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }
        .setup-guide-header h3 {
          margin: 0;
          color: #78350F;
        }
        .setup-steps {
          color: #78350F;
        }
        .setup-steps ol {
          margin: var(--spacing-md) 0;
          padding-left: var(--spacing-xl);
        }
        .setup-steps li {
          margin: var(--spacing-sm) 0;
        }
        .setup-steps code, .setup-steps a {
          color: #78350F;
        }
        .setup-steps a {
          text-decoration: underline;
        }
        .page-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }
        .gmail-connected-info {
          display: flex;
          gap: var(--spacing-md);
          align-items: flex-start;
          padding: var(--spacing-md);
          background: #F0FDF4;
          border-radius: var(--radius-md);
          border: 1px solid #BBF7D0;
        }
        .gmail-icon {
          font-size: 2rem;
        }
        .btn-loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .spinner-sm {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

export default Settings;
