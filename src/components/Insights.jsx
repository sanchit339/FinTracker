import { useEffect, useMemo, useState } from 'react';

const isInsightsEnabled = String(import.meta.env.VITE_ENABLE_HYBRID_INSIGHTS || 'false').toLowerCase() === 'true';

function Insights() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInsights();
  }, [selectedMonth]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statusResponse, snapshotResponse] = await Promise.all([
        fetch('/api/insights/status', { headers }),
        fetch(`/api/insights/snapshot?month=${selectedMonth}`, { headers })
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData);
      }

      if (snapshotResponse.ok) {
        const snapshotData = await snapshotResponse.json();
        setSnapshot(snapshotData.available ? snapshotData : null);
      } else if (snapshotResponse.status === 404) {
        setSnapshot(null);
      } else {
        const err = await snapshotResponse.json().catch(() => ({}));
        setError(err.error || 'Failed to load insights snapshot');
      }
    } catch (fetchError) {
      console.error('Insights fetch error:', fetchError);
      setError('Unable to fetch insights right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const runInsights = async (forceClusterRebuild = false) => {
    try {
      setRunning(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch('/api/insights/run', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          month: selectedMonth,
          forceClusterRebuild
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to run insights computation');
      }

      await fetchInsights();
    } catch (runError) {
      console.error('Insights run error:', runError);
      setError(runError.message || 'Failed to run insights computation');
    } finally {
      setRunning(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const suggestions = useMemo(() => {
    if (!snapshot?.summary) {
      return [];
    }

    const items = [];
    const { summary } = snapshot;

    if (summary.expenseTrendPct !== null && summary.expenseTrendPct > 15) {
      items.push(`Expenses are up ${summary.expenseTrendPct}% vs last month. Consider tightening your top spend categories this week.`);
    }

    if (summary.topCategory?.name) {
      items.push(`Your highest spend category is ${summary.topCategory.name}. Try setting a soft weekly cap for it.`);
    }

    if (summary.avgDailySpend > 0) {
      items.push(`Your average daily spend is ${formatCurrency(summary.avgDailySpend)}. A 10% cut can improve monthly savings noticeably.`);
    }

    if (items.length === 0) {
      items.push('Insights are healthy. Keep your current spending rhythm and monitor recurring payments weekly.');
    }

    return items;
  }, [snapshot]);

  if (!isInsightsEnabled) {
    return (
      <div className="insights-page">
        <div className="empty-state">
          <div className="empty-icon">🧪</div>
          <h3>Insights is currently disabled</h3>
          <p>Enable `VITE_ENABLE_HYBRID_INSIGHTS=true` to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-page">
      <div className="page-header">
        <div>
          <h1>Hybrid Insights</h1>
          <p className="subtitle">Rule-based patterns + transaction clustering</p>
        </div>

        <div className="header-actions">
          <div className="month-selector">
            <label htmlFor="insights-month">Month</label>
            <input
              id="insights-month"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
            />
          </div>

          <button className="btn btn-secondary" onClick={() => runInsights(true)} disabled={running}>
            {running ? 'Running…' : 'Run Insights'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="page-loading">
          <div className="spinner"></div>
          <p>Loading insights…</p>
        </div>
      ) : !snapshot ? (
        <div className="empty-state">
          <div className="empty-icon">📡</div>
          <h3>No snapshot for {selectedMonth}</h3>
          <p>Run the insights computation to generate your first snapshot for this month.</p>
          <button className="btn btn-primary" onClick={() => runInsights(true)} disabled={running}>
            {running ? 'Generating…' : 'Generate Snapshot'}
          </button>
        </div>
      ) : (
        <>
          <div className="summary-grid">
            <div className="summary-card">
              <p className="label">Net Savings</p>
              <h3 className={snapshot.summary.netSavings >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(snapshot.summary.netSavings)}
              </h3>
            </div>

            <div className="summary-card">
              <p className="label">Monthly Expenses</p>
              <h3>{formatCurrency(snapshot.summary.totalExpenses)}</h3>
              <p className="meta">
                {snapshot.summary.expenseTrendPct === null
                  ? 'No previous-month baseline yet'
                  : `${snapshot.summary.expenseTrendPct > 0 ? '↑' : '↓'} ${Math.abs(snapshot.summary.expenseTrendPct)}% vs last month`}
              </p>
            </div>

            <div className="summary-card">
              <p className="label">Avg Daily Spend</p>
              <h3>{formatCurrency(snapshot.summary.avgDailySpend)}</h3>
              <p className="meta">Across {snapshot.summary.daysWithSpend} active spend day(s)</p>
            </div>

            <div className="summary-card">
              <p className="label">Top Category</p>
              <h3>{snapshot.summary.topCategory?.name || 'N/A'}</h3>
              <p className="meta">
                {snapshot.summary.topCategory ? formatCurrency(snapshot.summary.topCategory.amount) : 'No debit transactions'}
              </p>
            </div>
          </div>

          <div className="insights-grid">
            <section className="insights-card">
              <div className="card-head">
                <h3>Stable Patterns</h3>
                <span className="badge">{snapshot.patterns.length}</span>
              </div>

              {snapshot.patterns.length === 0 ? (
                <p className="empty-text">No high-confidence patterns detected yet.</p>
              ) : (
                <div className="list">
                  {snapshot.patterns.map((pattern, index) => (
                    <article key={`${pattern.title}-${index}`} className="list-item">
                      <h4>{pattern.title}</h4>
                      <p>{pattern.description}</p>
                      <div className="chips">
                        <span className="chip">{pattern.patternType}</span>
                        <span className="chip">Confidence {Math.round((pattern.confidence || 0) * 100)}%</span>
                        <span className="chip">Impact {formatCurrency(pattern.impactScore || 0)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="insights-card">
              <div className="card-head">
                <h3>Discovered Clusters</h3>
                <span className="badge">{snapshot.clusters.length}</span>
              </div>

              {snapshot.clusters.length === 0 ? (
                <p className="empty-text">Clustering needs at least 30 debit transactions in the rolling window.</p>
              ) : (
                <div className="list">
                  {snapshot.clusters.map((cluster, index) => (
                    <article key={`${cluster.key}-${index}`} className="list-item">
                      <h4>{cluster.label}</h4>
                      <p>{cluster.description}</p>
                      <div className="chips">
                        <span className="chip">{cluster.transactionCount} txns</span>
                        <span className="chip">Avg {formatCurrency(cluster.avgAmount)}</span>
                        <span className="chip">Total {formatCurrency(cluster.totalAmount)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="insights-card full-width">
              <div className="card-head">
                <h3>Actionable Suggestions</h3>
                <span className="badge">{suggestions.length}</span>
              </div>

              <div className="list">
                {suggestions.map((item, index) => (
                  <article key={`${item}-${index}`} className="list-item">
                    <h4>Suggestion {index + 1}</h4>
                    <p>{item}</p>
                  </article>
                ))}
              </div>

              <p className="footnote">
                Last updated: {new Date(snapshot.generatedAt || snapshot.summary.generatedAt).toLocaleString('en-IN')}
                {status?.latestRun?.trigger_source ? ` • Trigger: ${status.latestRun.trigger_source}` : ''}
              </p>
            </section>
          </div>
        </>
      )}

      <style>{`
        .insights-page {
          padding: var(--spacing-xl);
          max-width: 1300px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
          flex-wrap: wrap;
        }

        .subtitle {
          margin: 0.35rem 0 0;
          color: var(--color-text-secondary);
        }

        .header-actions {
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
          flex-wrap: wrap;
        }

        .month-selector {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          background: white;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 0.45rem 0.7rem;
        }

        .month-selector label {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
        }

        .month-selector input {
          border: none;
          font-size: var(--font-size-sm);
          font-weight: 600;
        }

        .month-selector input:focus {
          outline: none;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .summary-card {
          background: white;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
        }

        .summary-card .label {
          margin: 0;
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
        }

        .summary-card h3 {
          margin: 0.35rem 0;
          font-size: 1.45rem;
          color: var(--color-text-primary);
        }

        .summary-card .meta {
          margin: 0;
          font-size: var(--font-size-xs);
        }

        .summary-card h3.positive {
          color: #16995f;
        }

        .summary-card h3.negative {
          color: #c63b3b;
        }

        .insights-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--spacing-lg);
        }

        .insights-card {
          background: white;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          min-height: 300px;
        }

        .insights-card.full-width {
          grid-column: 1 / -1;
        }

        .card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
          padding-bottom: var(--spacing-sm);
          border-bottom: 1px solid var(--color-border);
        }

        .card-head h3 {
          margin: 0;
          font-size: 1.15rem;
        }

        .badge {
          background: #eef6ff;
          color: #2b5f8f;
          border-radius: 999px;
          padding: 0.2rem 0.6rem;
          font-size: var(--font-size-xs);
          font-weight: 700;
        }

        .list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .list-item {
          border: 1px solid #e3ebf3;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbfe 100%);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
        }

        .list-item h4 {
          margin: 0 0 0.3rem 0;
          font-size: 1rem;
        }

        .list-item p {
          margin: 0;
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .chips {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          margin-top: 0.7rem;
        }

        .chip {
          background: #eef2f8;
          color: #41556f;
          border-radius: 999px;
          padding: 0.2rem 0.5rem;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .empty-text {
          color: var(--color-text-muted);
          margin: 0;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 320px;
          gap: var(--spacing-sm);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-lg);
          background: #fff;
          text-align: center;
          padding: var(--spacing-xl);
        }

        .empty-icon {
          font-size: 3rem;
        }

        .page-loading {
          min-height: 220px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
        }

        .alert {
          margin-bottom: var(--spacing-md);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
        }

        .alert-error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .footnote {
          margin: var(--spacing-md) 0 0;
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
        }

        @media (max-width: 980px) {
          .insights-grid {
            grid-template-columns: 1fr;
          }

          .insights-card.full-width {
            grid-column: auto;
          }
        }

        @media (max-width: 768px) {
          .insights-page {
            padding: var(--spacing-md);
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}

export default Insights;
