import { useState, useEffect } from 'react';

function Dashboard() {
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    transactionCount: 0,
    netCashFlow: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [syncStatus, setSyncStatus] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchLastSyncTime();
  }, []);

  const fetchLastSyncTime = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/gmail/sync/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.synced && data.lastSyncAt) {
          setLastSyncTime(new Date(data.lastSyncAt));
        }
      }
    } catch (error) {
      console.error('Error fetching last sync time:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch recent transactions
      const txnResponse = await fetch('/api/banking/transactions/recent?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (txnResponse.ok) {
        const txnData = await txnResponse.json();
        setRecentTransactions(txnData.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGmail = async () => {
    try {
      // Prevent multiple simultaneous syncs
      if (syncStatus.includes('⏳')) {
        console.log('Sync already in progress, skipping...');
        return;
      }

      setSyncStatus('⏳ Syncing emails...');
      const token = localStorage.getItem('token');

      if (!token) {
        setSyncStatus('❌ Not authenticated. Please log in again.');
        setTimeout(() => setSyncStatus(''), 5000);
        return;
      }

      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Handle different response codes
      if (response.status === 401) {
        setSyncStatus('❌ Session expired. Please log in again.');
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 2000);
        return;
      }

      if (response.status === 403) {
        setSyncStatus('❌ Gmail not connected. Please connect in Settings.');
        setTimeout(() => setSyncStatus(''), 5000);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        const message = data.isFirstSync
          ? `✅ Initial sync! Added ${data.transactionsAdded || 0} transactions from ${data.emailsProcessed || 0} emails`
          : data.emailsProcessed === 0
            ? '✅ Already up to date! No new emails found.'
            : `✅ Synced ${data.emailsProcessed} new emails, added ${data.transactionsAdded || 0} transactions`;

        setSyncStatus(message);

        if (data.lastSyncTime) {
          setLastSyncTime(new Date(data.lastSyncTime));
        }

        // Refresh data only if new transactions were added
        if (data.transactionsAdded > 0) {
          fetchDashboardData();
        }

        // Clear status after 5 seconds
        setTimeout(() => {
          setSyncStatus('');
        }, 5000);
      } else {
        // Handle API errors
        const errorMsg = data.error || 'Unknown error occurred';
        console.error('Sync error:', errorMsg);

        if (errorMsg.includes('Gmail not connected')) {
          setSyncStatus('❌ Gmail not connected. Go to Settings → Connect Gmail');
        } else if (errorMsg.includes('refresh token')) {
          setSyncStatus('❌ Gmail session expired. Please reconnect in Settings.');
        } else {
          setSyncStatus(`❌ Sync failed: ${errorMsg}`);
        }

        setTimeout(() => setSyncStatus(''), 7000);
      }
    } catch (error) {
      console.error('Sync error:', error);

      // Network or connection errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setSyncStatus('❌ Network error. Check your internet connection.');
      } else {
        setSyncStatus('❌ Unexpected error. Please try again.');
      }

      setTimeout(() => setSyncStatus(''), 5000);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    const raw = String(dateString).trim();
    const directMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);

    let day = '--';
    let month = '--';
    let year = '----';
    let minute = '--';
    let hour24 = 0;

    if (directMatch) {
      year = directMatch[1];
      month = directMatch[2];
      day = directMatch[3];
      hour24 = parseInt(directMatch[4], 10);
      minute = directMatch[5];
    } else {
      const date = new Date(dateString);
      if (!Number.isNaN(date.getTime())) {
        day = String(date.getDate()).padStart(2, '0');
        month = String(date.getMonth() + 1).padStart(2, '0');
        year = String(date.getFullYear());
        hour24 = date.getHours();
        minute = String(date.getMinutes()).padStart(2, '0');
      }
    }

    let timeEmoji = '⭐';
    if (hour24 >= 5 && hour24 < 12) timeEmoji = '☕';
    else if (hour24 >= 12 && hour24 < 17) timeEmoji = '☀️';
    else if (hour24 >= 17 && hour24 < 21) timeEmoji = '🌙';

    const hour12 = hour24 % 12 || 12;
    const period = hour24 >= 12 ? 'PM' : 'AM';

    return `${day}/${month}/${year} ${timeEmoji} ${String(hour12).padStart(2, '0')}:${minute} ${period}`;
  };

  const formatLastSync = (date) => {
    if (!date) return null;
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-loading">
          <div className="spinner"></div>
          <p className="text-muted mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Dashboard</h1>
          <p className="subtitle">
            Your financial overview
            {lastSyncTime && (
              <span> • Last synced {formatLastSync(lastSyncTime)}</span>
            )}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSyncGmail}>
          🔄 Sync Gmail
        </button>
      </div>

      {syncStatus && (
        <div className={`alert ${syncStatus.includes('✅') || syncStatus.includes('⏳') ? 'alert-success' : 'alert-error'}`}>
          {syncStatus}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EFF6FF' }}>💰</div>
          <div className="stat-content">
            <p className="stat-label">Total Balance</p>
            <h2 className="stat-value">{formatCurrency(stats.totalBalance)}</h2>
            <p className="stat-change">From all accounts</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#F0FDF4' }}>📈</div>
          <div className="stat-content">
            <p className="stat-label">Monthly Income</p>
            <h2 className="stat-value">{formatCurrency(stats.monthlyIncome)}</h2>
            <p className="stat-change positive">This month</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF2F2' }}>📉</div>
          <div className="stat-content">
            <p className="stat-label">Monthly Expenses</p>
            <h2 className="stat-value">{formatCurrency(stats.monthlyExpenses)}</h2>
            <p className="stat-change negative">This month</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#F5F3FF' }}>🔢</div>
          <div className="stat-content">
            <p className="stat-label">Transactions</p>
            <h2 className="stat-value">{stats.transactionCount}</h2>
            <p className="stat-change">This month</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="recent-transactions-section">
        <div className="section-header">
          <h3>Recent Transactions</h3>
          <a href="/transactions" className="btn btn-ghost btn-sm">View All →</a>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h4>No transactions yet</h4>
            <p className="text-secondary">Sync your Gmail to import transactions</p>
            <button className="btn btn-primary mt-3" onClick={handleSyncGmail}>
              Sync Gmail Now
            </button>
          </div>
        ) : (
          <div className="transactions-cards">
            {recentTransactions.slice(0, 5).map((txn) => (
              <div key={txn.id} className="transaction-card">
                <div className="transaction-left">
                  <div className={`transaction-icon ${txn.type.toLowerCase()}`}>
                    {txn.type === 'DEBIT' ? '📤' : '📥'}
                  </div>
                  <div className="transaction-details">
                    <h4 className="transaction-title">{txn.description || 'Transaction'}</h4>
                    <p className="transaction-meta">
                      {txn.bank_name} • {formatDate(txn.transaction_date)}
                    </p>
                  </div>
                </div>
                <div className={`transaction-amount ${txn.type.toLowerCase()}`}>
                  {txn.type === 'DEBIT' ? '-' : '+'}{formatCurrency(txn.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .dashboard-page {
          padding: var(--spacing-xl);
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xl);
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }

        .header-content h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.25rem 0;
        }

        .subtitle {
          color: var(--text-muted);
          font-size: var(--font-size-sm);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
        }

        .stat-card {
          background: white;
          padding: var(--spacing-lg);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          display: flex;
          gap: var(--spacing-md);
          align-items: flex-start;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .stat-content {
          flex: 1;
          min-width: 0;
        }

        .stat-label {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          margin: 0 0 0.25rem 0;
          white-space: nowrap;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
          color: var(--text-primary);
          word-break: break-word;
        }

        .stat-change {
          font-size: var(--font-size-xs);
          margin: 0;
          color: var(--text-secondary);
        }

        .stat-change.positive {
          color: #16A34A;
        }

        .stat-change.negative {
          color: #DC2626;
        }

        .recent-transactions-section {
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          padding: var(--spacing-lg);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-lg);
          padding-bottom: var(--spacing-md);
          border-bottom: 1px solid var(--border-color);
        }

        .section-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .transactions-cards {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .transaction-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          transition: all 0.2s;
        }

        .transaction-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border-color: #D1D5DB;
        }

        .transaction-left {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          flex: 1;
          min-width: 0;
        }

        .transaction-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .transaction-icon.debit {
          background: #FEE2E2;
        }

        .transaction-icon.credit {
          background: #DCFCE7;
        }

        .transaction-details {
          flex: 1;
          min-width: 0;
        }

        .transaction-title {
          margin: 0 0 0.25rem 0;
          font-size: var(--font-size-md);
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .transaction-meta {
          margin: 0;
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .transaction-amount {
          font-size: 1.125rem;
          font-weight: 700;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .transaction-amount.debit {
          color: #DC2626;
        }

        .transaction-amount.credit {
          color: #16A34A;
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

        .page-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        @media (max-width: 640px) {
          .stat-value {
            font-size: 1.25rem;
          }

          .transaction-item {
            flex-wrap: wrap;
          }

          .transaction-amount {
            width: 100%;
            text-align: left;
            margin-left: 56px;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
