const asBoolean = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const normalized = String(value).trim().toLowerCase();
    return normalized === 'true'
        || normalized === '1'
        || normalized === 'yes'
        || normalized === 'on';
};

export const getFeatures = () => ({
    hybridInsights: asBoolean(process.env.ENABLE_HYBRID_INSIGHTS, false)
});

export const isHybridInsightsEnabled = () => getFeatures().hybridInsights;

export default getFeatures;
