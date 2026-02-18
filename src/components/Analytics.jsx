import { useState, useEffect, useRef } from 'react';

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });

const loadAmCharts = (() => {
  let promise = null;

  return async () => {
    if (window.am5 && window.am5percent && window.am5xy && window.am5themes_Animated) {
      return;
    }

    if (!promise) {
      promise = Promise.all([
        loadScript('https://cdn.amcharts.com/lib/5/index.js'),
        loadScript('https://cdn.amcharts.com/lib/5/percent.js'),
        loadScript('https://cdn.amcharts.com/lib/5/xy.js'),
        loadScript('https://cdn.amcharts.com/lib/5/themes/Animated.js')
      ]);
    }

    await promise;
  };
})();

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amChartsReady, setAmChartsReady] = useState(false);
  const [eChartsReady, setEChartsReady] = useState(false);
  const [chartsLoadError, setChartsLoadError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const pieChartRef = useRef(null);
  const lineChartRef = useRef(null);
  const lineRootRef = useRef(null);

  const loadECharts = (() => {
    let promise = null;

    return async () => {
      if (window.echarts) {
        return;
      }

      if (!promise) {
        promise = loadScript('https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js');
      }

      await promise;
    };
  })();

  useEffect(() => {
    fetchAnalytics();
  }, [selectedMonth]);

  useEffect(() => {
    let isMounted = true;

    const initAmCharts = async () => {
      try {
        await Promise.all([loadAmCharts(), loadECharts()]);
        if (isMounted) {
          setAmChartsReady(true);
          setEChartsReady(true);
        }
      } catch (error) {
        console.error('Failed to load amCharts:', error);
        if (isMounted) {
          setChartsLoadError('Failed to load charts');
        }
      }
    };

    initAmCharts();

    return () => {
      isMounted = false;
    };
  }, []);

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
      'Food & Dining': '#f59e55',
      'Transportation': '#5aa9ff',
      'Shopping': '#d78bff',
      'Bills & Utilities': '#8d95ff',
      'Entertainment': '#45c9e5',
      'Healthcare': '#3ecf9e',
      'Salary': '#2fc98f',
      'Digital Payments': '#4f8eff',
      'Investment': '#33cf97',
      'Rent': '#ff7a87',
      'Credit Card Bill': '#f7b955',
      'Uncategorized': '#95a3b3'
    };
    return colors[category] || '#95a3b3';
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

  useEffect(() => {
    if (!eChartsReady || !analytics || !pieChartRef.current) {
      return;
    }

    const categoryData = (analytics.categoryBreakdown || []).map((cat) => ({
      value: parseFloat(cat.amount || 0),
      name: cat.category,
      itemStyle: { color: getCategoryColor(cat.category) }
    }));

    if (categoryData.length === 0) {
      return;
    }

    const chart = window.echarts.init(pieChartRef.current);
    const option = {
      legend: {
        top: 'bottom',
        textStyle: { color: '#4a5b72' }
      },
      toolbox: {
        show: true,
        feature: {
          mark: { show: true },
          dataView: { show: true, readOnly: true },
          restore: { show: true },
          saveAsImage: { show: true }
        }
      },
      series: [
        {
          name: 'Category Distribution',
          type: 'pie',
          radius: [50, 180],
          center: ['50%', '45%'],
          roseType: 'area',
          itemStyle: {
            borderRadius: 8
          },
          data: categoryData
        }
      ]
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [analytics, eChartsReady]);

  useEffect(() => {
    if (!amChartsReady || !analytics || !lineChartRef.current) {
      return;
    }

    const dailyData = (analytics.dailySpending || []).map((item) => ({
      day: String(item.day),
      income: parseFloat(item.income || 0),
      expense: parseFloat(item.expense || 0)
    }));

    if (lineRootRef.current) {
      lineRootRef.current.dispose();
      lineRootRef.current = null;
    }

    if (dailyData.length === 0) {
      return;
    }

    const am5 = window.am5;
    const am5xy = window.am5xy;
    const am5themes_Animated = window.am5themes_Animated;

    const root = am5.Root.new(lineChartRef.current);
    lineRootRef.current = root;

    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: 'none',
        wheelY: 'none',
        layout: root.verticalLayout
      })
    );

    chart.plotContainer.setAll({
      paddingTop: 10
    });

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: 'day',
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: 30
        })
      })
    );
    xAxis.data.setAll(dailyData);

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: am5xy.AxisRendererY.new(root, {})
      })
    );
    xAxis.get('renderer').labels.template.setAll({
      fill: am5.color(0x6b7280),
      fontSize: 11
    });
    yAxis.get('renderer').labels.template.setAll({
      fill: am5.color(0x6b7280),
      fontSize: 11
    });
    xAxis.get('renderer').grid.template.setAll({
      strokeOpacity: 0.08
    });
    yAxis.get('renderer').grid.template.setAll({
      strokeOpacity: 0.08
    });

    const expenseSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'Expenses',
        xAxis,
        yAxis,
        valueYField: 'expense',
        categoryXField: 'day',
        stroke: am5.color(0xff7a87),
        tooltip: am5.Tooltip.new(root, {
          labelText: 'Day {categoryX}: ₹{valueY.formatNumber("#,###")}'
        })
      })
    );
    expenseSeries.data.setAll(dailyData);
    expenseSeries.strokes.template.setAll({ strokeWidth: 3 });
    expenseSeries.fills.template.setAll({
      fill: am5.color(0xff7a87),
      fillOpacity: 0.1,
      visible: true
    });
    expenseSeries.bullets.push(() =>
      am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, {
          radius: 4,
          fill: am5.color(0xff7a87),
          stroke: am5.color(0xffffff),
          strokeWidth: 2
        })
      })
    );

    const incomeSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: 'Income',
        xAxis,
        yAxis,
        valueYField: 'income',
        categoryXField: 'day',
        stroke: am5.color(0x2fc98f),
        tooltip: am5.Tooltip.new(root, {
          labelText: 'Day {categoryX}: ₹{valueY.formatNumber("#,###")}'
        })
      })
    );
    incomeSeries.data.setAll(dailyData);
    incomeSeries.strokes.template.setAll({ strokeWidth: 3 });
    incomeSeries.fills.template.setAll({
      fill: am5.color(0x2fc98f),
      fillOpacity: 0.1,
      visible: true
    });
    incomeSeries.bullets.push(() =>
      am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, {
          radius: 4,
          fill: am5.color(0x2fc98f),
          stroke: am5.color(0xffffff),
          strokeWidth: 2
        })
      })
    );

    chart.set(
      'cursor',
      am5xy.XYCursor.new(root, {
        behavior: 'none'
      })
    );

    const legend = chart.children.push(
      am5.Legend.new(root, {
        centerX: am5.percent(50),
        x: am5.percent(50),
        marginTop: 8
      })
    );
    legend.labels.template.setAll({
      fill: am5.color(0x374151),
      fontSize: 12
    });
    legend.markers.template.setAll({
      width: 10,
      height: 10
    });
    legend.data.setAll(chart.series.values);

    expenseSeries.appear(800);
    incomeSeries.appear(800);
    chart.appear(800, 100);

    return () => {
      if (lineRootRef.current) {
        lineRootRef.current.dispose();
        lineRootRef.current = null;
      }
    };
  }, [analytics, amChartsReady]);

  useEffect(() => {
    return () => {
      if (lineRootRef.current) {
        lineRootRef.current.dispose();
        lineRootRef.current = null;
      }
    };
  }, []);

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
            {chartsLoadError ? (
              <div className="empty-chart">
                <div className="empty-icon">⚠️</div>
                <p>{chartsLoadError}</p>
              </div>
            ) : categoryBreakdown && categoryBreakdown.length > 0 ? (
              <div ref={pieChartRef} className="amchart-root" />
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
            {chartsLoadError ? (
              <div className="empty-chart">
                <div className="empty-icon">⚠️</div>
                <p>{chartsLoadError}</p>
              </div>
            ) : analytics.dailySpending && analytics.dailySpending.length > 0 ? (
              <div ref={lineChartRef} className="amchart-root" />
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
          background:
            radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.09), transparent 35%),
            radial-gradient(circle at 100% 100%, rgba(16, 185, 129, 0.08), transparent 35%),
            #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
        }

        .chart-container {
          padding: var(--spacing-lg);
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }

        .amchart-root {
          width: 100%;
          height: 380px;
          border-radius: 12px;
          overflow: hidden;
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
