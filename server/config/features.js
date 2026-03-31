const asBoolean = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return String(value).toLowerCase() === 'true';
};

export const getFeatures = () => ({
    hybridInsights: asBoolean(process.env.ENABLE_HYBRID_INSIGHTS, false)
});

export const isHybridInsightsEnabled = () => getFeatures().hybridInsights;

export default getFeatures;
