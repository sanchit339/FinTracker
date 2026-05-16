import { useState, useEffect } from 'react';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'ALL',
    limit: 20,
    offset: 0
  });
  const [pagination, setPagination] = useState({
    total: 0,
    hasMore: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [monthlyStats, setMonthlyStats] = useState({
    income: 0,
    expense: 0
  });
  const [filteredStats, setFilteredStats] = useState({
    income: 0,
    expense: 0
  });
  const [categories, setCategories] = useState([]);
  const [editingTxId, setEditingTxId] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/banking/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCategoryUpdate = async (txId, newCategoryId) => {
    if (!newCategoryId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/banking/transactions/${txId}/category`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ categoryId: newCategoryId })
      });
      if (response.ok) {
        const category = categories.find(c => c.id === parseInt(newCategoryId));
        setTransactions(prev => prev.map(tx => {
          if (tx.id === txId) {
            return { ...tx, category_id: parseInt(newCategoryId), category_name: category ? category.name : null };
          }
          return tx;
        }));
        setEditingTxId(null);
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  useEffect(() => {
    // Reset offset when search term or filters change so we start from page 1
    if (filters.offset !== 0 && (searchTerm || startDate || endDate || selectedCategory !== 'ALL')) {
      setFilters(prev => ({ ...prev, offset: 0 }));
    } else {
      fetchTransactions();
    }
  }, [filters, startDate, endDate, searchTerm, selectedCategory]);

  // Separate effect for monthly stats - only when date range changes
  useEffect(() => {
    if (startDate || endDate) {
      // Only fetch when date filter is applied
      fetchMonthlyStats();
    } else if (filters.offset === 0 && !startDate && !endDate) {
      // Or on initial load without date filter
      fetchMonthlyStats();
    }
  }, [startDate, endDate]);

  const fetchMonthlyStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMonthlyStats({
          income: data.monthlyIncome || 0,
          expense: data.monthlyExpenses || 0
        });
      }
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const params = new URLSearchParams({
        limit: filters.limit,
        offset: filters.offset
      });

      if (filters.type !== 'ALL') {
        params.append('type', filters.type);
      }

      // Add search filter
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      // Add category filter
      if (selectedCategory !== 'ALL') {
        params.append('categoryId', selectedCategory);
      }

      // Add date range filters to backend query
      if (startDate) {
        const d = new Date(startDate);
        d.setHours(0, 0, 0, 0);
        params.append('startDate', d.toISOString());
      }
      
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        params.append('endDate', d.toISOString());
      }

      const response = await fetch(`/api/banking/transactions/recent?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        setPagination(data.pagination || { total: 0, hasMore: false });
        if (data.aggregates) {
          setFilteredStats({
            income: data.aggregates.totalIncome || 0,
            expense: data.aggregates.totalExpenses || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (type) => {
    setFilters({ ...filters, type, offset: 0 });
  };

  const handleLoadMore = () => {
    // Increment offset to load more, keeps current filters (type and date)
    setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  };

  const handleDateChange = (type, newDate) => {
    if (type === 'start') setStartDate(newDate);
    else setEndDate(newDate);
    setFilters({ ...filters, offset: 0 }); // Reset pagination
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
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
      const utcDate = new Date(Date.UTC(
        parseInt(directMatch[1], 10),
        parseInt(directMatch[2], 10) - 1,
        parseInt(directMatch[3], 10),
        parseInt(directMatch[4], 10),
        parseInt(directMatch[5], 10)
      ));
      
      // Add 5 hours 30 mins for Mumbai time
      utcDate.setTime(utcDate.getTime() + (5.5 * 60 * 60 * 1000));

      year = String(utcDate.getUTCFullYear());
      month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      day = String(utcDate.getUTCDate()).padStart(2, '0');
      hour24 = utcDate.getUTCHours();
      minute = String(utcDate.getUTCMinutes()).padStart(2, '0');
    } else {
      const date = new Date(dateString);
      if (!Number.isNaN(date.getTime())) {
        const utcDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        day = String(utcDate.getUTCDate()).padStart(2, '0');
        month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
        year = String(utcDate.getUTCFullYear());
        hour24 = utcDate.getUTCHours();
        minute = String(utcDate.getUTCMinutes()).padStart(2, '0');
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

  const getCategoryColor = (category) => {
    const colors = {
      'Food & Dining': '#F97316',
      'Transportation': '#3B82F6',
      'Shopping': '#EC4899',
      'Bills & Utilities': '#8B5CF6',
      'Entertainment': '#06B6D4',
      'Healthcare': '#10B981',
      'Salary': '#22C55E',
      'Digital Payments': '#6366F1',
      'Investment': '#10B981',
      'Rent': '#EF4444',
      'Credit Card Bill': '#F59E0B',
      'Uncategorized': '#6B7280'
    };
    return colors[category] || '#6B7280';
  };

  // Determine which totals to show and labels
  const isFiltered = !!searchTerm || !!startDate || !!endDate || selectedCategory !== 'ALL' || filters.type !== 'ALL';
  const displayTotals = isFiltered ? filteredStats : monthlyStats;

  return (
    <div className="transactions-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Transactions</h1>
          <p className="subtitle">
            {isFiltered
              ? `${pagination.total} matching transaction${pagination.total !== 1 ? 's' : ''}`
              : `${pagination.total} transaction${pagination.total !== 1 ? 's' : ''} this month`
            }
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="controls-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filters.type === 'ALL' ? 'active' : ''}`}
            onClick={() => handleFilterChange('ALL')}
          >
            <span className="tab-icon">📊</span>
            All
          </button>
          <button
            className={`filter-tab ${filters.type === 'DEBIT' ? 'active' : ''}`}
            onClick={() => handleFilterChange('DEBIT')}
          >
            <span className="tab-icon">📤</span>
            Expenses
          </button>
          <button
            className={`filter-tab ${filters.type === 'CREDIT' ? 'active' : ''}`}
            onClick={() => handleFilterChange('CREDIT')}
          >
            <span className="tab-icon">📥</span>
            Income
          </button>
        </div>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by description, bank, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              className="search-clear"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="category-filter-box">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select-filter"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        <div className="date-range-filters">
          <div className="date-filter-box">
            <span className="date-label">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="date-input"
            />
            {startDate && (
              <button
                className="date-clear"
                onClick={() => handleDateChange('start', '')}
                title="Clear start date"
              >
                ✕
              </button>
            )}
          </div>

          <div className="date-filter-box">
            <span className="date-label">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="date-input"
            />
            {endDate && (
              <button
                className="date-clear"
                onClick={() => handleDateChange('end', '')}
                title="Clear end date"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card income">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <p className="summary-label">
              {startDate && endDate && startDate === endDate
                ? `Income on ${new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                : startDate || endDate
                  ? `Income ${startDate ? `from ${new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''} ${endDate ? `to ${new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}`
                  : searchTerm || selectedCategory !== 'ALL' || filters.type !== 'ALL'
                    ? 'Filtered Income'
                    : 'Total Income (This Month)'
              }
            </p>
            <h3 className="summary-value">{formatCurrency(displayTotals.income)}</h3>
            <p className="summary-count">
              {transactions.filter(t => t.type === 'CREDIT').length} transaction{transactions.filter(t => t.type === 'CREDIT').length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="summary-card expense">
          <div className="summary-icon">📉</div>
          <div className="summary-content">
            <p className="summary-label">
              {startDate && endDate && startDate === endDate
                ? `Expenses on ${new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                : startDate || endDate
                  ? `Expenses ${startDate ? `from ${new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''} ${endDate ? `to ${new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}`
                  : searchTerm || selectedCategory !== 'ALL' || filters.type !== 'ALL'
                    ? 'Filtered Expenses'
                    : 'Total Expenses (This Month)'
              }
            </p>
            <h3 className="summary-value">{formatCurrency(displayTotals.expense)}</h3>
            <p className="summary-count">
              {transactions.filter(t => t.type === 'DEBIT').length} transaction{transactions.filter(t => t.type === 'DEBIT').length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="transactions-wrapper" style={{ position: 'relative', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        {loading && (
          <div className="inline-loading">
            <div className="inline-spinner"></div>
          </div>
        )}

        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No transactions found</h3>
            <p className="text-secondary">
              {searchTerm || startDate || endDate || selectedCategory !== 'ALL'
                ? 'Try adjusting your filters or search terms'
                : 'Sync your Gmail to import transactions'
              }
            </p>
          </div>
        ) : (
          <div className="transactions-container">
            {transactions.map((txn) => (
              <div key={txn.id} className="transaction-card">
                <div className="transaction-header">
                  <div className="transaction-left">
                    <div className={`transaction-icon ${txn.type.toLowerCase()}`}>
                      {txn.type === 'DEBIT' ? '📤' : '📥'}
                    </div>
                    <div className="transaction-info">
                      <h4 className="transaction-title">{txn.description || 'Transaction'}</h4>
                      <div className="transaction-meta">
                        <span className="meta-item">
                          <span className="meta-icon">🏦</span>
                          {txn.bank_name}
                        </span>
                        {txn.account_number_masked && (
                          <>
                            <span className="meta-divider">•</span>
                            <span className="meta-item">{txn.account_number_masked}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="transaction-right">
                    <div className={`transaction-amount ${txn.type.toLowerCase()}`}>
                      {txn.type === 'DEBIT' ? '-' : '+'}{formatCurrency(txn.amount)}
                    </div>
                    {editingTxId === txn.id ? (
                      <select 
                        className="category-select" 
                        defaultValue={txn.category_id || ''}
                        onChange={(e) => handleCategoryUpdate(txn.id, e.target.value)}
                        onBlur={() => setEditingTxId(null)}
                        autoFocus
                      >
                        <option value="" disabled>Select Category</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {txn.category_name ? (
                          <div
                            className="category-badge editable-badge"
                            style={{
                              backgroundColor: `${getCategoryColor(txn.category_name)}15`,
                              color: getCategoryColor(txn.category_name),
                              borderColor: `${getCategoryColor(txn.category_name)}30`
                            }}
                            onClick={() => setEditingTxId(txn.id)}
                            title="Click to edit category"
                          >
                            {txn.category_name} ✏️
                          </div>
                        ) : (
                          <button 
                            className="btn btn-sm btn-ghost add-category-btn" 
                            onClick={() => setEditingTxId(txn.id)}
                          >
                            + Add Category
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="transaction-footer">
                  <span className="transaction-date">
                    <span className="date-icon">📅</span>
                    {formatDate(txn.transaction_date)}
                  </span>
                  {txn.balance_after && (
                    <span className="transaction-balance">
                      Balance: {formatCurrency(txn.balance_after)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination.hasMore && (
          <div className="load-more-container">
            <button
              className="btn-load-more"
              onClick={handleLoadMore}
              disabled={loading}
            >
              {loading ? '⏳ Loading...' : '📄 Load More'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .transactions-page {
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

        .controls-bar {
          display: flex;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
          flex-wrap: wrap;
        }

        .filter-tabs {
          display: flex;
          gap: var(--spacing-sm);
          background: white;
          padding: 0.25rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          flex: 1;
          min-width: 300px;
        }

        .filter-tab {
          flex: 1;
          padding: var(--spacing-sm) var(--spacing-md);
          border: none;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--text-secondary);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .filter-tab:hover {
          background: #F9FAFB;
          color: var(--text-primary);
        }

        .filter-tab.active {
          background: var(--primary-color);
          color: white !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .filter-tab.active .tab-icon,
        .filter-tab.active span {
          color: white !important;
        }

        .tab-icon {
          font-size: 1.125rem;
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          font-size: 1.125rem;
          z-index: 1;
        }

        .search-input {
          width: 100%;
          padding: var(--spacing-sm) 2.75rem var(--spacing-sm) 2.75rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          font-size: var(--font-size-md);
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-clear {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 1.25rem;
          padding: 0.25rem;
          line-height: 1;
          transition: color 0.2s;
          z-index: 1;
        }

        .search-clear:hover {
          color: var(--text-primary);
        }

        .category-filter-box {
          flex: 0 0 auto;
          min-width: 180px;
        }

        .category-select-filter {
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          font-size: var(--font-size-md);
          background: white;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .category-select-filter:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .date-range-filters {
          display: flex;
          gap: var(--spacing-md);
          flex-wrap: wrap;
        }

        .date-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          position: absolute;
          top: -0.5rem;
          left: 0.75rem;
          background: white;
          padding: 0 0.25rem;
          z-index: 1;
        }

        .date-filter-box {
          flex: 0 0 auto;
          width: 170px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .date-input {
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          font-size: var(--font-size-md);
          transition: border-color 0.2s;
          cursor: pointer;
        }

        .date-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .date-input::-webkit-calendar-picker-indicator {
          cursor: pointer;
        }

        .date-clear {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 1.125rem;
          padding: 0.25rem;
          line-height: 1;
          transition: color 0.2s;
          z-index: 1;
        }

        .date-clear:hover {
          color: var(--text-primary);
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
        }

        .summary-card {
          background: white;
          padding: var(--spacing-lg);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .summary-card.income {
          background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
          border-color: #BBF7D0;
        }

        .summary-card.expense {
          background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
          border-color: #FECACA;
        }

        .summary-icon {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-md);
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .summary-content {
          flex: 1;
        }

        .summary-label {
          margin: 0 0 0.25rem 0;
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          font-weight: 500;
        }

        .summary-value {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .summary-count {
          margin: 0.25rem 0 0 0;
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
          font-weight: 500;
        }

        .transactions-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .transaction-card {
          background: white;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--spacing-sm) var(--spacing-md);
          transition: all 0.2s;
          cursor: pointer;
        }

        .transaction-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }

        .transaction-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--spacing-md);
        }

        .transaction-left {
          display: flex;
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

        .transaction-info {
          flex: 1;
          min-width: 0;
        }

        .transaction-title {
          margin: 0 0 0.25rem 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .transaction-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .meta-icon {
          font-size: 0.875rem;
        }

        .meta-divider {
          color: var(--border-color);
        }

        .transaction-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.375rem;
        }

        .transaction-amount {
          font-size: 1.125rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .transaction-amount.debit {
          color: #DC2626;
        }

        .transaction-amount.credit {
          color: #16A34A;
        }

        .category-badge {
          padding: 0.2rem 0.625rem;
          border-radius: var(--radius-md);
          font-size: var(--font-size-xs);
          font-weight: 600;
          border: 1px solid;
          white-space: nowrap;
        }

        .transaction-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: var(--spacing-sm);
          margin-top: var(--spacing-sm);
          border-top: 1px solid var(--border-color);
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
        }

        .editable-badge {
          cursor: pointer;
          transition: transform 0.1s, box-shadow 0.1s;
        }

        .editable-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .category-select {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--primary-color);
          background-color: white;
          font-size: var(--font-size-sm);
          color: var(--text-primary);
          cursor: pointer;
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .add-category-btn {
          padding: 0.2rem 0.5rem;
          font-size: 0.75rem;
          height: auto;
          min-height: 0;
          color: var(--text-muted);
        }

        .transaction-date {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .date-icon {
          font-size: 1rem;
        }

        .transaction-balance {
          font-weight: 500;
        }

        .empty-state {
          background: white;
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl) var(--spacing-lg);
          text-align: center;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: var(--spacing-md);
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.25rem;
        }

        .empty-state p {
          margin: 0;
          color: var(--text-secondary);
        }

        .load-more-container {
          display: flex;
          justify-content: center;
          padding: var(--spacing-lg) 0;
        }

        .btn-load-more {
          padding: var(--spacing-sm) var(--spacing-xl);
          background: white;
          border: 2px solid var(--primary-color);
          color: var(--primary-color);
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: var(--font-size-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-load-more:hover:not(:disabled) {
          background: var(--primary-color);
          color: white;
        }

        .btn-load-more:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .inline-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
        }

        .inline-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(59, 130, 246, 0.1);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .transactions-page {
            padding: var(--spacing-md);
          }

          .header-content h1 {
            font-size: 1.5rem;
          }

          .controls-bar {
            flex-direction: column;
          }

          .filter-tabs,
          .search-box,
          .date-filter-box {
            min-width: 100%;
          }

          .summary-cards {
            grid-template-columns: 1fr;
          }

          .transaction-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .transaction-right {
            width: 100%;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }

          .transaction-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div >
  );
}

export default Transactions;
