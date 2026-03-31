const DAY_MS = 24 * 60 * 60 * 1000;

const toNumber = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const round = (value, digits = 2) => {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
};

const getStdDev = (values) => {
    if (!values.length) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
    return Math.sqrt(variance);
};

const formatTitle = (value) => {
    if (!value) return 'Unknown';
    return value
        .split(' ')
        .filter(Boolean)
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(' ');
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

    const tokens = raw.split(' ').slice(0, 4);
    return tokens.join(' ');
};

const getTimeBucket = (hour) => {
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 22) return 'Evening';
    return 'Night';
};

const detectRecurringSpends = (debitTransactions) => {
    const groups = new Map();

    for (const transaction of debitTransactions) {
        const merchantKey = normalizeMerchantKey(transaction);
        if (!groups.has(merchantKey)) {
            groups.set(merchantKey, []);
        }
        groups.get(merchantKey).push(transaction);
    }

    const findings = [];

    for (const [merchantKey, entries] of groups.entries()) {
        if (entries.length < 3 || merchantKey === 'unknown') {
            continue;
        }

        entries.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

        const intervals = [];
        for (let index = 1; index < entries.length; index += 1) {
            const currentDate = new Date(entries[index].transaction_date);
            const previousDate = new Date(entries[index - 1].transaction_date);
            const intervalDays = (currentDate - previousDate) / DAY_MS;
            if (intervalDays > 0) {
                intervals.push(intervalDays);
            }
        }

        if (intervals.length < 2) {
            continue;
        }

        const avgInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
        const intervalStdDev = getStdDev(intervals);

        const amounts = entries.map((entry) => toNumber(entry.amount));
        const avgAmount = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
        const amountStdDev = getStdDev(amounts);
        const amountCV = avgAmount > 0 ? amountStdDev / avgAmount : 99;

        const looksMonthly = avgInterval >= 21 && avgInterval <= 40;
        const looksWeekly = avgInterval >= 5 && avgInterval <= 10;
        const regularInterval = intervalStdDev <= 6;
        const regularAmount = amountCV <= 0.35;

        if (!(regularInterval && regularAmount && (looksMonthly || looksWeekly))) {
            continue;
        }

        const latest = entries[entries.length - 1];
        const estimatedNext = new Date(new Date(latest.transaction_date).getTime() + (avgInterval * DAY_MS));
        const confidence = Math.min(0.98, 0.55 + (entries.length * 0.06) - (amountCV * 0.25) - (intervalStdDev * 0.02));
        const totalSpent = amounts.reduce((sum, value) => sum + value, 0);

        findings.push({
            patternType: 'RECURRING_SPEND',
            title: `Recurring spend detected: ${formatTitle(merchantKey)}`,
            description: `You have ${entries.length} similar payments around every ${round(avgInterval, 1)} days.`,
            confidence: round(Math.max(0.5, confidence), 2),
            impactScore: round(totalSpent, 2),
            metadata: {
                merchant: merchantKey,
                paymentCount: entries.length,
                averageAmount: round(avgAmount, 2),
                averageIntervalDays: round(avgInterval, 1),
                estimatedNextDebitDate: estimatedNext.toISOString()
            }
        });
    }

    return findings;
};

const detectSpendSpikes = (debitTransactions, now) => {
    const currentWindowStart = new Date(now.getTime() - (30 * DAY_MS));
    const previousWindowStart = new Date(now.getTime() - (60 * DAY_MS));

    const currentTotals = new Map();
    const previousTotals = new Map();

    for (const transaction of debitTransactions) {
        const date = new Date(transaction.transaction_date);
        const key = transaction.category_name || 'Uncategorized';
        const amount = toNumber(transaction.amount);

        if (date >= currentWindowStart) {
            currentTotals.set(key, (currentTotals.get(key) || 0) + amount);
        } else if (date >= previousWindowStart && date < currentWindowStart) {
            previousTotals.set(key, (previousTotals.get(key) || 0) + amount);
        }
    }

    const findings = [];

    for (const [category, currentSpend] of currentTotals.entries()) {
        const previousSpend = previousTotals.get(category) || 0;
        if (currentSpend < 1000) {
            continue;
        }

        if (previousSpend === 0 && currentSpend >= 2500) {
            findings.push({
                patternType: 'SPEND_SPIKE',
                title: `New spending spike in ${category}`,
                description: `This category is newly active with ${round(currentSpend, 0)} spent in the last 30 days.`,
                confidence: 0.73,
                impactScore: round(currentSpend, 2),
                metadata: {
                    category,
                    currentWindowSpend: round(currentSpend, 2),
                    previousWindowSpend: 0,
                    spikeRatio: null
                }
            });
            continue;
        }

        if (previousSpend > 0) {
            const ratio = currentSpend / previousSpend;
            if (ratio >= 1.5) {
                const confidence = Math.min(0.95, 0.6 + ((ratio - 1.5) * 0.15));
                findings.push({
                    patternType: 'SPEND_SPIKE',
                    title: `Spending spike in ${category}`,
                    description: `${category} spend is up ${(ratio * 100 - 100).toFixed(0)}% compared to the previous 30 days.`,
                    confidence: round(confidence, 2),
                    impactScore: round(currentSpend - previousSpend, 2),
                    metadata: {
                        category,
                        currentWindowSpend: round(currentSpend, 2),
                        previousWindowSpend: round(previousSpend, 2),
                        spikeRatio: round(ratio, 2)
                    }
                });
            }
        }
    }

    return findings;
};

const detectTemporalHabits = (debitTransactions) => {
    if (debitTransactions.length < 8) {
        return [];
    }

    const dayCounts = new Map();
    const timeBucketCounts = new Map();

    for (const transaction of debitTransactions) {
        const date = new Date(transaction.transaction_date);
        const day = date.toLocaleDateString('en-US', { weekday: 'long' });
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);

        const bucket = getTimeBucket(date.getHours());
        timeBucketCounts.set(bucket, (timeBucketCounts.get(bucket) || 0) + 1);
    }

    const findings = [];

    const topDay = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topDay) {
        const share = topDay[1] / debitTransactions.length;
        if (share >= 0.35) {
            findings.push({
                patternType: 'TIME_HABIT',
                title: `${topDay[0]} is your most active spending day`,
                description: `${(share * 100).toFixed(0)}% of your debit transactions happen on ${topDay[0]}s.`,
                confidence: round(Math.min(0.9, 0.58 + share), 2),
                impactScore: round(share * 100, 2),
                metadata: {
                    dominantDay: topDay[0],
                    transactionSharePct: round(share * 100, 2)
                }
            });
        }
    }

    const topBucket = [...timeBucketCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topBucket) {
        const share = topBucket[1] / debitTransactions.length;
        if (share >= 0.4) {
            findings.push({
                patternType: 'TIME_HABIT',
                title: `${topBucket[0]} spending habit detected`,
                description: `${(share * 100).toFixed(0)}% of your debit transactions happen in the ${topBucket[0].toLowerCase()}.`,
                confidence: round(Math.min(0.88, 0.55 + share), 2),
                impactScore: round(share * 100, 2),
                metadata: {
                    dominantTimeBucket: topBucket[0],
                    transactionSharePct: round(share * 100, 2)
                }
            });
        }
    }

    return findings;
};

const detectMerchantConcentration = (debitTransactions) => {
    if (debitTransactions.length < 10) {
        return [];
    }

    const merchantTotals = new Map();
    let totalDebit = 0;

    for (const transaction of debitTransactions) {
        const merchantKey = normalizeMerchantKey(transaction);
        if (merchantKey === 'unknown') {
            continue;
        }

        const amount = toNumber(transaction.amount);
        merchantTotals.set(merchantKey, (merchantTotals.get(merchantKey) || 0) + amount);
        totalDebit += amount;
    }

    const topMerchant = [...merchantTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!topMerchant || totalDebit <= 0) {
        return [];
    }

    const share = topMerchant[1] / totalDebit;
    if (share < 0.28) {
        return [];
    }

    return [{
        patternType: 'MERCHANT_CONCENTRATION',
        title: `High spend concentration at ${formatTitle(topMerchant[0])}`,
        description: `${(share * 100).toFixed(0)}% of your debit amount goes to this merchant.`,
        confidence: round(Math.min(0.95, 0.5 + share), 2),
        impactScore: round(topMerchant[1], 2),
        metadata: {
            merchant: topMerchant[0],
            merchantSpend: round(topMerchant[1], 2),
            totalDebit: round(totalDebit, 2),
            concentrationPct: round(share * 100, 2)
        }
    }];
};

const dedupePatterns = (patterns) => {
    const seen = new Set();
    const deduped = [];

    for (const pattern of patterns) {
        const key = `${pattern.patternType}:${pattern.title}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        deduped.push(pattern);
    }

    return deduped;
};

export const buildPatternFindings = (transactions, now = new Date()) => {
    const debitTransactions = transactions.filter((transaction) => transaction.type === 'DEBIT');

    const patterns = [
        ...detectRecurringSpends(debitTransactions),
        ...detectSpendSpikes(debitTransactions, now),
        ...detectTemporalHabits(debitTransactions),
        ...detectMerchantConcentration(debitTransactions)
    ];

    return dedupePatterns(patterns)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 12);
};

export default {
    buildPatternFindings
};
