const toNumber = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const round = (value, digits = 2) => {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
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

const getTimeBucket = (hour) => {
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 22) return 'Evening';
    return 'Night';
};

const merchantHash = (merchant) => {
    const key = merchant || 'unknown';
    let hash = 0;

    for (let index = 0; index < key.length; index += 1) {
        hash = ((hash * 31) + key.charCodeAt(index)) % 1009;
    }

    return hash / 1009;
};

const categoryIndex = (category, categories) => {
    const index = categories.indexOf(category);
    if (index < 0 || categories.length <= 1) {
        return 0;
    }

    return index / (categories.length - 1);
};

const buildFeatureRows = (transactions) => {
    const categories = [...new Set(transactions.map((transaction) => transaction.category_name || 'Uncategorized'))];

    return transactions.map((transaction) => {
        const date = new Date(transaction.transaction_date);
        const weekday = date.getDay();
        const hour = date.getHours();
        const merchantKey = normalizeMerchantKey(transaction);
        const amount = toNumber(transaction.amount);

        const features = [
            Math.log10(Math.max(1, amount)),
            Math.sin((2 * Math.PI * weekday) / 7),
            Math.cos((2 * Math.PI * weekday) / 7),
            hour / 23,
            categoryIndex(transaction.category_name || 'Uncategorized', categories),
            merchantHash(merchantKey)
        ];

        return {
            transaction,
            merchantKey,
            amount,
            hour,
            features
        };
    });
};

const minMaxNormalize = (rows) => {
    if (!rows.length) {
        return rows;
    }

    const dimension = rows[0].features.length;
    const mins = new Array(dimension).fill(Infinity);
    const maxs = new Array(dimension).fill(-Infinity);

    for (const row of rows) {
        for (let index = 0; index < dimension; index += 1) {
            mins[index] = Math.min(mins[index], row.features[index]);
            maxs[index] = Math.max(maxs[index], row.features[index]);
        }
    }

    return rows.map((row) => ({
        ...row,
        normalized: row.features.map((value, index) => {
            const spread = maxs[index] - mins[index];
            if (spread === 0) {
                return 0;
            }
            return (value - mins[index]) / spread;
        })
    }));
};

const euclideanDistance = (vectorA, vectorB) => {
    let total = 0;
    for (let index = 0; index < vectorA.length; index += 1) {
        const diff = vectorA[index] - vectorB[index];
        total += diff * diff;
    }
    return Math.sqrt(total);
};

const meanVector = (vectors, dimension) => {
    const sum = new Array(dimension).fill(0);
    for (const vector of vectors) {
        for (let index = 0; index < dimension; index += 1) {
            sum[index] += vector[index];
        }
    }

    return sum.map((value) => value / vectors.length);
};

const initializeCentroids = (rows, clusterCount) => {
    if (rows.length <= clusterCount) {
        return rows.map((row) => row.normalized);
    }

    const centroids = [];
    const step = rows.length / clusterCount;

    for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
        const rowIndex = Math.min(rows.length - 1, Math.floor(clusterIndex * step));
        centroids.push(rows[rowIndex].normalized.slice());
    }

    return centroids;
};

const assignClusters = (rows, centroids) => {
    return rows.map((row) => {
        let closestIndex = 0;
        let closestDistance = Infinity;

        for (let index = 0; index < centroids.length; index += 1) {
            const distance = euclideanDistance(row.normalized, centroids[index]);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        }

        return {
            ...row,
            clusterIndex: closestIndex,
            distance: closestDistance
        };
    });
};

const recomputeCentroids = (assignments, previousCentroids) => {
    const dimension = previousCentroids[0].length;
    const clusters = new Array(previousCentroids.length).fill(null).map(() => []);

    for (const assignment of assignments) {
        clusters[assignment.clusterIndex].push(assignment.normalized);
    }

    return clusters.map((vectors, index) => {
        if (!vectors.length) {
            return previousCentroids[index];
        }
        return meanVector(vectors, dimension);
    });
};

const summarizeCluster = (clusterRows, clusterIndex) => {
    const transactionCount = clusterRows.length;
    const totalAmount = clusterRows.reduce((sum, row) => sum + row.amount, 0);
    const avgAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;

    const categoryCounts = new Map();
    const merchantCounts = new Map();
    const timeBucketCounts = new Map();

    for (const row of clusterRows) {
        const category = row.transaction.category_name || 'Uncategorized';
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        merchantCounts.set(row.merchantKey, (merchantCounts.get(row.merchantKey) || 0) + 1);
        const bucket = getTimeBucket(row.hour);
        timeBucketCounts.set(bucket, (timeBucketCounts.get(bucket) || 0) + 1);
    }

    const dominantCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Uncategorized';
    const dominantMerchant = [...merchantCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    const dominantTimeBucket = [...timeBucketCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Anytime';

    const labelPrefix = avgAmount >= 3000 ? 'High Value' : avgAmount <= 500 ? 'Micro Spend' : 'Routine';
    const label = `${dominantCategory} ${labelPrefix}`;
    const description = `${transactionCount} transactions, mostly in ${dominantTimeBucket.toLowerCase()} with avg ${round(avgAmount, 0)}.`;

    return {
        key: `C${clusterIndex + 1}`,
        label,
        description,
        transactionCount,
        avgAmount: round(avgAmount, 2),
        totalAmount: round(totalAmount, 2),
        metadata: {
            dominantCategory,
            dominantMerchant,
            dominantTimeBucket
        },
        members: clusterRows.map((row) => ({
            transactionId: row.transaction.id,
            distance: round(row.distance, 6)
        }))
    };
};

export const buildTransactionClusters = (transactions) => {
    if (transactions.length < 30) {
        return {
            clusters: [],
            skipped: true,
            reason: 'Insufficient transactions for stable clustering'
        };
    }

    const featureRows = minMaxNormalize(buildFeatureRows(transactions));
    const clusterCount = Math.min(5, Math.max(2, Math.floor(Math.sqrt(featureRows.length / 2))));

    let centroids = initializeCentroids(featureRows, clusterCount);
    let assignments = [];

    for (let iteration = 0; iteration < 15; iteration += 1) {
        assignments = assignClusters(featureRows, centroids);
        const updatedCentroids = recomputeCentroids(assignments, centroids);

        const drift = updatedCentroids.reduce((sum, centroid, index) => {
            return sum + euclideanDistance(centroid, centroids[index]);
        }, 0);

        centroids = updatedCentroids;

        if (drift <= 0.0001) {
            break;
        }
    }

    const groupedRows = new Map();
    for (const assignment of assignments) {
        if (!groupedRows.has(assignment.clusterIndex)) {
            groupedRows.set(assignment.clusterIndex, []);
        }
        groupedRows.get(assignment.clusterIndex).push(assignment);
    }

    const clusters = [...groupedRows.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([clusterIndex, rows]) => summarizeCluster(rows, clusterIndex));

    return {
        clusters,
        skipped: false,
        reason: null
    };
};

export default {
    buildTransactionClusters
};
