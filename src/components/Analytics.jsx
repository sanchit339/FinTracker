import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchAnalytics();
  }, [selectedMonth]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Calculate start and end dates for selected month
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const response = await fetch(`/api/analytics/stats?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
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

  const getCategoryEmoji = (category) => {
    const emojis = {
      'Food & Dining': '🍔',
      'Transportation': '🚗',
      'Shopping': '🛍️',
      'Bills & Utilities': '💡',
      'Entertainment': '🎬',
      'Healthcare': '🏥',
      'Salary': '💰',
      'Digital Payments': '💳',
      'Investment': '📈',
      'Rent': '🏠',
      'Credit Card Bill': '💳',
      'Uncategorized': '📦'
    };
    return emojis[category] || '📦';
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="page-loading">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-page">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No analytics data available</h3>
          <p>Sync your Gmail to start seeing insights</p>
        </div>
      </div>
    );
  }

  const { summary, categoryBreakdown, topCategories, mostSpentCategory } = analytics;

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Analytics</h1>
          <p className="subtitle">Spending insights and trends</p>
        </div>
        <div className="month-selector">
          <label htmlFor="month">Month:</label>
          <input
            type="month"
            id="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
            className="month-input"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card savings">
          <div className="summary-icon">💎</div>
          <div className="summary-content">
            <p className="summary-label">Savings</p>
            <h3 className={`summary-value ${summary.savings >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(summary.savings)}
            </h3>
            <p className="summary-meta">
              {summary.savings >= 0 ? '📈 Surplus' : '📉 Deficit'}
            </p>
          </div>
        </div>

        <div className="summary-card avg-spending">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <p className="summary-label">Avg Daily Spending</p>
            <h3 className="summary-value">{formatCurrency(summary.avgDailySpending)}</h3>
            <p className="summary-meta">Per day</p>
          </div>
        </div>

        <div className="summary-card top-category">
          <div className="summary-icon">
            {mostSpentCategory ? getCategoryEmoji(mostSpentCategory.category) : '🏆'}
          </div>
          <div className="summary-content">
            <p className="summary-label">Top Category</p>
            <h3 className="summary-value-text">
              {mostSpentCategory ? mostSpentCategory.category : 'N/A'}
            </h3>
            <p className="summary-meta">
              {mostSpentCategory ? formatCurrency(mostSpentCategory.amount) : '-'}
            </p>
          </div>
        </div>

        <div className="summary-card transactions">
          <div className="summary-icon">🔢</div>
          <div className="summary-content">
            <p className="summary-label">Transactions</p>
            <h3 className="summary-value">{summary.totalTransactions}</h3>
            <p className="summary-meta">
              {summary.expenseCount} expenses • {summary.incomeCount} income
            </p>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Category Breakdown */}
        <div className="analytics-card category-breakdown">
          <div className="card-header">
            <h3>Category Breakdown</h3>
            <span className="badge">Top {Math.min(categoryBreakdown.length, 8)}</span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="empty-message">
              <p>No expense data for this month</p>
            </div>
          ) : (
            <div className="category-list">
              {categoryBreakdown.slice(0, 8).map((cat, idx) => (
                <div key={idx} className="category-item">
                  <div className="category-info">
                    <span className="category-emoji">{getCategoryEmoji(cat.category)}</span>
                    <div className="category-details">
                      <span className="category-name">{cat.category}</span>
                      <span className="category-count">{cat.count} transactions</span>
                    </div>
                  </div>
                  <div className="category-stats">
                    <span className="category-amount">{formatCurrency(cat.amount)}</span>
                    <span className="category-percentage">{cat.percentage}%</span>
                  </div>
                  <div
                    className="category-bar"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: getCategoryColor(cat.category)
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spending Insights */}
        <div className="analytics-card insights">
          <div className="card-header">
            <h3>Spending Insights</h3>
          </div>

          <div className="insights-content">
            {/* Budget Health */}
            <div className="insight-item">
              <div className="insight-icon">
                {summary.savings >= 0 ? '✅' : '⚠️'}
              </div>
              <div className="insight-text">
                <h4>Budget Health</h4>
                <p>
                  {summary.savings >= 0
                    ? `Great! You saved ${formatCurrency(summary.savings)} this month.`
                    : `You're ${formatCurrency(Math.abs(summary.savings))} over budget.`
                  }
                </p>
              </div>
            </div>

            {/* Top Spending */}
            {mostSpentCategory && (
              <div className="insight-item">
                <div className="insight-icon">🎯</div>
                <div className="insight-text">
                  <h4>Top Spending</h4>
                  <p>
                    You spent {mostSpentCategory.percentage}% ({formatCurrency(mostSpentCategory.amount)})
                    on {mostSpentCategory.category.toLowerCase()}.
                  </p>
                </div>
              </div>
            )}

            {/* Daily Average */}
            <div className="insight-item">
              <div className="insight-icon">📅</div>
              <div className="insight-text">
                <h4>Daily Average</h4>
                <p>
                  You spend an average of {formatCurrency(summary.avgDailySpending)} per day.
                </p>
              </div>
            </div>

            {/* Transaction Volume */}
            <div className="insight-item">
              <div className="insight-icon">💳</div>
              <div className="insight-text">
                <h4>Transaction Volume</h4>
                <p>
                  You made {summary.totalTransactions} transactions this month
                  ({summary.expenseCount} expenses, {summary.incomeCount} income).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Pie Chart - Category Breakdown */}
        <div className="analytics-card chart-card pie-chart-card">
          <div className="card-header">
            <h3>Category Distribution</h3>
            <span className="badge">Spending Breakdown</span>
          </div>
          <div className="chart-container">
            {categoryBreakdown && categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <defs>
                    {/* Create gradient definitions for each category */}
                    {categoryBreakdown.map((cat, index) => {
                      const baseColor = getCategoryColor(cat.category);
                      return (
                        <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={baseColor} stopOpacity={1} />
                          <stop offset="100%" stopColor={baseColor} stopOpacity={0.7} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <Pie
                    data={categoryBreakdown.map(cat => ({
                      name: cat.category,
                      value: parseFloat(cat.amount),
                      percentage: cat.percentage,
                      emoji: getCategoryEmoji(cat.category)
                    }))}
                    cx="50%"
                    cy="45%"
                    innerRadius={85}
                    outerRadius={130}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percentage, emoji }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 25;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);

                      if (percentage < 5) return null; // Hide labels for small slices

                      return (
                        <g>
                          <text
                            x={x}
                            y={y - 8}
                            fill="#1F2937"
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            style={{ fontSize: '20px' }}
                          >
                            {emoji}
                          </text>
                          <text
                            x={x}
                            y={y + 12}
                            fill="#6B7280"
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            style={{ fontSize: '13px', fontWeight: 600 }}
                          >
                            {percentage}%
                          </text>
                        </g>
                      );
                    }}
                  >
                    {categoryBreakdown.map((cat, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#gradient-${index})`}
                        stroke="white"
                        strokeWidth={3}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="custom-tooltip">
                            <div className="tooltip-header">
                              <span className="tooltip-emoji">{data.emoji}</span>
                              <span className="tooltip-category">{data.name}</span>
                            </div>
                            <div className="tooltip-amount">{formatCurrency(data.value)}</div>
                            <div className="tooltip-percentage">{data.percentage}% of total</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={60}
                    iconType="circle"
                    formatter={(value, entry) => {
                      const emoji = getCategoryEmoji(value);
                      return `${emoji} ${value}`;
                    }}
                    wrapperStyle={{
                      paddingTop: '20px',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">
                <div className="empty-icon">📊</div>
                <p>No category data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Line Chart - Daily Spending */}
        <div className="analytics-card chart-card">
          <div className="card-header">
            <h3>Daily Spending Pattern</h3>
            <span className="badge">Day-by-Day</span>
          </div>
          <div className="chart-container">
            {analytics.dailySpending && analytics.dailySpending.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={analytics.dailySpending}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }}
                    stroke="#6b7280"
                  />
                  <YAxis
                    label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }}
                    stroke="#6b7280"
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={(label) => `Day ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Expenses"
                    dot={{ fill: '#EF4444', r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Income"
                    dot={{ fill: '#10B981', r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">
                <div className="empty-icon">📈</div>
                <p>No daily spending data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .analytics-page {
          padding: var(--spacing-xl);
          max-width: 1400px;
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
          color: var(--text-secondary);
          font-size: var(--font-size-md);
          margin: 0;
        }

        .month-selector {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: white;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
        }

        .month-selector label {
          font-size: var(--font-size-sm);
          font-weight: 500;
          color: var(--text-secondary);
        }

        .month-input {
          border: none;
          background: none;
          font-size: var(--font-size-md);
          font-weight: 600;
          color: var(--text-primary);
          cursor: pointer;
        }

        .month-input:focus {
          outline: none;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
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

        .summary-card.savings {
          background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
          border-color: #BBF7D0;
        }

        .summary-card.avg-spending {
          background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
          border-color: #FECACA;
        }

        .summary-card.top-category {
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border-color: #BFDBFE;
        }

        .summary-card.transactions {
          background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
          border-color: #DDD6FE;
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
          flex-shrink: 0;
        }

        .summary-content {
          flex: 1;
          min-width: 0;
        }

        .summary-label {
          margin: 0 0 0.25rem 0;
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          font-weight: 500;
        }

        .summary-value {
          margin: 0 0 0.25rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .summary-value.positive {
          color: #16A34A;
        }

        .summary-value.negative {
          color: #DC2626;
        }

        .summary-value-text {
          margin: 0 0 0.25rem 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .summary-meta {
          margin: 0;
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: var(--spacing-lg);
        }

        .analytics-card {
          background: white;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-lg);
          padding-bottom: var(--spacing-md);
          border-bottom: 1px solid var(--border-color);
        }

        .card-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .badge {
          padding: 0.25rem 0.75rem;
          background: #F3F4F6;
          color: var(--text-secondary);
          border-radius: var(--radius-md);
          font-size: var(--font-size-xs);
          font-weight: 600;
        }

        .category-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .category-item {
          position: relative;
          padding-bottom: var(--spacing-sm);
        }

        .category-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: 0.5rem;
        }

        .category-emoji {
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F9FAFB;
          border-radius: var(--radius-md);
        }

        .category-details {
          flex: 1;
          min-width: 0;
        }

        .category-name {
          display: block;
          font-weight: 600;
          color: var(--text-primary);
          font-size: var(--font-size-md);
        }

        .category-count {
          display: block;
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
        }

        .category-stats {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.125rem;
        }

        .category-amount {
          font-weight: 700;
          color: var(--text-primary);
          font-size: var(--font-size-md);
        }

        .category-percentage {
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
          font-weight: 600;
        }

        .category-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 4px;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .insights-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .insight-item {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: #F9FAFB;
          border-radius: var(--radius-md);
        }

        .insight-icon {
          width: 40px;
          height: 40px;
          background: white;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .insight-text {
          flex: 1;
        }

        .insight-text h4 {
          margin: 0 0 0.25rem 0;
          font-size: var(--font-size-md);
          font-weight: 600;
          color: var(--text-primary);
        }

        .insight-text p {
          margin: 0;
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .empty-message {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-secondary);
        }

        .page-loading, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: var(--spacing-md);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: var(--spacing-md);
        }

        .empty-state h3 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.25rem;
        }

        .empty-state p {
          margin: 0.5rem 0 0 0;
          color: var(--text-secondary);
        }

        /* Charts Section */
        .charts-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: var(--spacing-xl);
          margin-top: var(--spacing-xl);
        }

        .chart-card {
          min-height: 450px;
          background: white;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .chart-container {
          padding: var(--spacing-lg);
          display: flex;
          justify-content: center;
          align-items: center;
          background: #FAFBFC;
        }

        .empty-chart {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-secondary);
        }

        .empty-chart .empty-icon {
          font-size: 4rem;
          margin-bottom: var(--spacing-md);
          opacity: 0.5;
        }

        .empty-chart p {
          margin: 0;
          font-size: var(--font-size-md);
          font-weight: 500;
        }

        @media (max-width: 1200px) {
          .charts-section {
            grid-template-columns: 1fr;
          }
          
          .chart-card {
            min-height: 400px;
          }
        }

        @media (max-width: 768px) {
          .analytics-page {
            padding: var(--spacing-md);
          }

          .header-content h1 {
            font-size: 1.5rem;
          }

          .analytics-grid {
            grid-template-columns: 1fr;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .category-item {
            display: grid;
            grid- template-columns: auto 1fr auto;
            grid-template-rows: auto auto;
            gap: var(--spacing-sm);
          }

          .category-info {
            grid-column: 1 / 3;
          }

          .category-stats {
            grid-column: 3;
            grid-row: 1;
          }

          .category-bar {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
}

export default Analytics;
