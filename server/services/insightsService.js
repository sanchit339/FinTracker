import pool from '../config/database.js';
import { buildPatternFindings } from './patternEngine.js';
import { buildTransactionClusters } from './clusterEngine.js';
import ensureInsightsSchema from './insightsSchema.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CLUSTER_REBUILD_INTERVAL_MS = 7 * DAY_MS;
const WINDOW_DAYS = 120;

const round = (value, digits = 2) => {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
};

const toNumber = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeMerchantKey = (transaction) => {
    const raw = String(transaction.merchant || transaction.description || 'unknown')
        .toLowerCase()
        .replace(/payment to|payment from|upi|vpa|txn|transaction|received|debited|credited/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!raw) {
        return 'unknown';
    }

    return raw.split(' ').slice(0, 4).join(' ');
};

const getIstParts = (date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const parts = formatter.formatToParts(date);
    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return {
        year: parseInt(lookup.year, 10),
        month: parseInt(lookup.month, 10),
        day: parseInt(lookup.day, 10)
    };
};

const getMonthBounds = (monthValue) => {
    if (monthValue && !/^\d{4}-\d{2}$/.test(monthValue)) {
        throw new Error('Invalid month. Expected YYYY-MM format');
    }

    let year;
    let month;

    if (monthValue) {
        [year, month] = monthValue.split('-').map((value) => parseInt(value, 10));
    } else {
        const today = getIstParts();
        year = today.year;
        month = today.month;
    }

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        throw new Error('Invalid month. Expected YYYY-MM format');
    }

    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;

    const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:30`);
    const end = new Date(new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+05:30`).getTime() - 1);

    return {
        monthKey: `${year}-${String(month).padStart(2, '0')}`,
        start,
        end
    };
};

const getPreviousMonthBounds = (monthBounds) => {
    const [year, month] = monthBounds.monthKey.split('-').map((value) => parseInt(value, 10));

    const previousYear = month === 1 ? year - 1 : year;
    const previousMonth = month === 1 ? 12 : month - 1;

    return getMonthBounds(`${previousYear}-${String(previousMonth).padStart(2, '0')}`);
};

const parseMaybeJson = (value, fallback) => {
    if (value === null || value === undefined) {
        return fallback;
    }

    if (typeof value === 'object') {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
};

const buildSummary = ({ transactions, monthBounds, newTransactionsCount, generatedAt }) => {
    const periodTransactions = transactions.filter((transaction) => {
        const date = new Date(transaction.transaction_date);
        return date >= monthBounds.start && date <= monthBounds.end;
    });

    const debitTransactions = periodTransactions.filter((transaction) => transaction.type === 'DEBIT');
    const creditTransactions = periodTransactions.filter((transaction) => transaction.type === 'CREDIT');

    const totalExpenses = debitTransactions.reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
    const totalIncome = creditTransactions.reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);

    const daysWithSpend = new Set(
        debitTransactions.map((transaction) => {
            const date = new Date(transaction.transaction_date);
            return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        })
    ).size;

    const categoryTotals = new Map();
    const merchantTotals = new Map();

    for (const transaction of debitTransactions) {
        const category = transaction.category_name || 'Uncategorized';
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + toNumber(transaction.amount));

        const merchant = normalizeMerchantKey(transaction);
        merchantTotals.set(merchant, (merchantTotals.get(merchant) || 0) + toNumber(transaction.amount));
    }

    const topCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    const topMerchant = [...merchantTotals.entries()].sort((a, b) => b[1] - a[1])[0];

    const previousBounds = getPreviousMonthBounds(monthBounds);
    const previousMonthExpenses = transactions
        .filter((transaction) => {
            const date = new Date(transaction.transaction_date);
            return transaction.type === 'DEBIT' && date >= previousBounds.start && date <= previousBounds.end;
        })
        .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);

    const expenseTrendPct = previousMonthExpenses > 0
        ? ((totalExpenses - previousMonthExpenses) / previousMonthExpenses) * 100
        : null;

    return {
        month: monthBounds.monthKey,
        totalIncome: round(totalIncome, 2),
        totalExpenses: round(totalExpenses, 2),
        netSavings: round(totalIncome - totalExpenses, 2),
        transactionCount: periodTransactions.length,
        debitTransactionCount: debitTransactions.length,
        creditTransactionCount: creditTransactions.length,
        avgDailySpend: round(daysWithSpend > 0 ? totalExpenses / daysWithSpend : 0, 2),
        daysWithSpend,
        topCategory: topCategory ? { name: topCategory[0], amount: round(topCategory[1], 2) } : null,
        topMerchant: topMerchant ? { name: topMerchant[0], amount: round(topMerchant[1], 2) } : null,
        expenseTrendPct: expenseTrendPct === null ? null : round(expenseTrendPct, 2),
        newTransactionsProcessed: newTransactionsCount,
        generatedAt: generatedAt.toISOString()
    };
};

const insertPatternFindings = async (client, userId, runId, patterns) => {
    for (const pattern of patterns) {
        await client.query(
            `INSERT INTO pattern_findings
                (user_id, run_id, pattern_type, title, description, confidence, impact_score, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
            [
                userId,
                runId,
                pattern.patternType,
                pattern.title,
                pattern.description,
                round(pattern.confidence, 2),
                round(pattern.impactScore || 0, 2),
                JSON.stringify(pattern.metadata || {})
            ]
        );
    }
};

const insertClusters = async (client, userId, runId, clusters) => {
    for (const cluster of clusters) {
        const clusterResult = await client.query(
            `INSERT INTO transaction_clusters
                (user_id, run_id, cluster_key, label, description, transaction_count, avg_amount, total_amount, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
             RETURNING id`,
            [
                userId,
                runId,
                cluster.key,
                cluster.label,
                cluster.description,
                cluster.transactionCount,
                cluster.avgAmount,
                cluster.totalAmount,
                JSON.stringify(cluster.metadata || {})
            ]
        );

        const clusterId = clusterResult.rows[0].id;

        for (const member of cluster.members || []) {
            await client.query(
                `INSERT INTO transaction_cluster_members
                    (user_id, run_id, cluster_id, transaction_id, distance)
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, runId, clusterId, member.transactionId, member.distance]
            );
        }
    }
};

class InsightsService {
    async runHybridInsightsForUser(userId, options = {}) {
        const triggerSource = options.triggerSource || 'manual';
        const monthValue = options.month || null;
        const forceClusterRebuild = options.forceClusterRebuild === true;

        await ensureInsightsSchema();

        const now = new Date();
        const monthBounds = getMonthBounds(monthValue);
        const windowStart = new Date(now.getTime() - (WINDOW_DAYS * DAY_MS));

        let runId;
        let newTransactionsCount = 0;
        let state = {
            last_processed_transaction_id: 0,
            last_cluster_rebuild_at: null
        };
        let maxTransactionId = 0;
        let shouldRebuildClusters = false;
        const startedAtMs = Date.now();

        const lockClient = await pool.connect();
        try {
            await lockClient.query('BEGIN');

            await lockClient.query(
                `INSERT INTO insight_user_state (user_id)
                 VALUES ($1)
                 ON CONFLICT (user_id) DO NOTHING`,
                [userId]
            );

            const stateResult = await lockClient.query(
                `SELECT last_processed_transaction_id, last_cluster_rebuild_at
                 FROM insight_user_state
                 WHERE user_id = $1
                 FOR UPDATE`,
                [userId]
            );

            if (stateResult.rows[0]) {
                state = stateResult.rows[0];
            }

            const maxTransactionResult = await lockClient.query(
                `SELECT COALESCE(MAX(id), 0) AS max_id
                 FROM transactions
                 WHERE user_id = $1`,
                [userId]
            );

            maxTransactionId = parseInt(maxTransactionResult.rows[0].max_id, 10) || 0;

            const newTransactionsResult = await lockClient.query(
                `SELECT COUNT(*) AS count
                 FROM transactions
                 WHERE user_id = $1
                 AND id > $2`,
                [userId, parseInt(state.last_processed_transaction_id, 10) || 0]
            );

            newTransactionsCount = parseInt(newTransactionsResult.rows[0].count, 10) || 0;

            const lastClusterRebuild = state.last_cluster_rebuild_at ? new Date(state.last_cluster_rebuild_at) : null;
            const clusterStale = !lastClusterRebuild || (now - lastClusterRebuild) >= CLUSTER_REBUILD_INTERVAL_MS;

            shouldRebuildClusters = forceClusterRebuild || clusterStale || newTransactionsCount > 0;

            const runResult = await lockClient.query(
                `INSERT INTO insight_runs
                    (user_id, trigger_source, window_start, window_end, new_transactions_count, status)
                 VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS')
                 RETURNING id`,
                [userId, triggerSource, windowStart, now, newTransactionsCount]
            );

            runId = runResult.rows[0].id;

            await lockClient.query('COMMIT');
        } catch (error) {
            await lockClient.query('ROLLBACK');
            throw error;
        } finally {
            lockClient.release();
        }

        try {
            const transactionsResult = await pool.query(
                `SELECT
                    t.id,
                    t.amount,
                    t.type,
                    t.description,
                    t.merchant,
                    t.transaction_date,
                    c.name AS category_name
                 FROM transactions t
                 LEFT JOIN categories c ON t.category_id = c.id
                 WHERE t.user_id = $1
                 AND t.transaction_date >= $2
                 AND t.transaction_date <= $3
                 ORDER BY t.transaction_date ASC`,
                [userId, windowStart, now]
            );

            const transactions = transactionsResult.rows;
            const patternFindings = buildPatternFindings(transactions, now);

            const debitTransactions = transactions.filter((transaction) => transaction.type === 'DEBIT');
            const clusterResult = shouldRebuildClusters
                ? buildTransactionClusters(debitTransactions)
                : { clusters: [], skipped: true, reason: 'Cluster rebuild skipped for this run' };

            const clusters = clusterResult.clusters || [];
            const summary = buildSummary({
                transactions,
                monthBounds,
                newTransactionsCount,
                generatedAt: now
            });

            const saveClient = await pool.connect();
            try {
                await saveClient.query('BEGIN');

                await insertPatternFindings(saveClient, userId, runId, patternFindings);

                if (shouldRebuildClusters && clusters.length > 0) {
                    await insertClusters(saveClient, userId, runId, clusters);
                }

                await saveClient.query(
                    `INSERT INTO insight_snapshots
                        (user_id, run_id, period_start, period_end, summary, patterns, clusters)
                     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)`,
                    [
                        userId,
                        runId,
                        monthBounds.start,
                        monthBounds.end,
                        JSON.stringify(summary),
                        JSON.stringify(patternFindings),
                        JSON.stringify(clusters)
                    ]
                );

                await saveClient.query(
                    `UPDATE insight_user_state
                     SET last_processed_transaction_id = $2,
                         last_run_at = $3,
                         last_cluster_rebuild_at = CASE WHEN $4 THEN $3 ELSE last_cluster_rebuild_at END,
                         updated_at = $3
                     WHERE user_id = $1`,
                    [userId, maxTransactionId, now, shouldRebuildClusters]
                );

                await saveClient.query(
                    `UPDATE insight_runs
                     SET status = 'SUCCESS',
                         completed_at = $2,
                         duration_ms = $3
                     WHERE id = $1`,
                    [runId, now, Date.now() - startedAtMs]
                );

                await saveClient.query('COMMIT');
            } catch (error) {
                await saveClient.query('ROLLBACK');
                throw error;
            } finally {
                saveClient.release();
            }

            return {
                success: true,
                runId,
                triggerSource,
                month: monthBounds.monthKey,
                newTransactionsCount,
                patternCount: patternFindings.length,
                clusterCount: clusters.length,
                clusterRebuilt: shouldRebuildClusters,
                clusterSkippedReason: clusterResult.reason || null,
                generatedAt: now.toISOString()
            };
        } catch (error) {
            await pool.query(
                `UPDATE insight_runs
                 SET status = 'FAILED',
                     error_message = $2,
                     completed_at = $3,
                     duration_ms = $4
                 WHERE id = $1`,
                [runId, error.message, new Date(), Date.now() - startedAtMs]
            );

            throw error;
        }
    }

    async getSnapshotForMonth(userId, monthValue) {
        await ensureInsightsSchema();

        const monthBounds = getMonthBounds(monthValue);

        const snapshotResult = await pool.query(
            `SELECT
                s.id,
                s.generated_at,
                s.summary,
                s.patterns,
                s.clusters,
                r.id AS run_id,
                r.status AS run_status,
                r.trigger_source,
                r.completed_at
             FROM insight_snapshots s
             LEFT JOIN insight_runs r ON r.id = s.run_id
             WHERE s.user_id = $1
             AND s.period_start = $2
             ORDER BY s.generated_at DESC
             LIMIT 1`,
            [userId, monthBounds.start]
        );

        if (!snapshotResult.rows.length) {
            return {
                available: false,
                month: monthBounds.monthKey
            };
        }

        const row = snapshotResult.rows[0];

        return {
            available: true,
            month: monthBounds.monthKey,
            generatedAt: row.generated_at,
            run: {
                id: row.run_id,
                status: row.run_status,
                triggerSource: row.trigger_source,
                completedAt: row.completed_at
            },
            summary: parseMaybeJson(row.summary, {}),
            patterns: parseMaybeJson(row.patterns, []),
            clusters: parseMaybeJson(row.clusters, [])
        };
    }

    async getStatus(userId) {
        await ensureInsightsSchema();

        const [runResult, stateResult, snapshotResult] = await Promise.all([
            pool.query(
                `SELECT id, status, trigger_source, new_transactions_count, started_at, completed_at, error_message
                 FROM insight_runs
                 WHERE user_id = $1
                 ORDER BY started_at DESC
                 LIMIT 1`,
                [userId]
            ),
            pool.query(
                `SELECT last_processed_transaction_id, last_run_at, last_cluster_rebuild_at, updated_at
                 FROM insight_user_state
                 WHERE user_id = $1`,
                [userId]
            ),
            pool.query(
                `SELECT generated_at, period_start, period_end
                 FROM insight_snapshots
                 WHERE user_id = $1
                 ORDER BY generated_at DESC
                 LIMIT 1`,
                [userId]
            )
        ]);

        return {
            latestRun: runResult.rows[0] || null,
            state: stateResult.rows[0] || null,
            latestSnapshot: snapshotResult.rows[0] || null
        };
    }
}

export default new InsightsService();
