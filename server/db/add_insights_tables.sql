-- Hybrid Insights additive schema

CREATE TABLE IF NOT EXISTS insight_runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trigger_source VARCHAR(32) NOT NULL,
    window_start TIMESTAMP,
    window_end TIMESTAMP,
    new_transactions_count INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS insight_user_state (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_processed_transaction_id INTEGER DEFAULT 0,
    last_run_at TIMESTAMP,
    last_cluster_rebuild_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pattern_findings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER NOT NULL REFERENCES insight_runs(id) ON DELETE CASCADE,
    pattern_type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    confidence NUMERIC(5, 2) NOT NULL,
    impact_score NUMERIC(15, 2) DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_clusters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER NOT NULL REFERENCES insight_runs(id) ON DELETE CASCADE,
    cluster_key VARCHAR(32) NOT NULL,
    label VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    transaction_count INTEGER NOT NULL,
    avg_amount NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_cluster_members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER NOT NULL REFERENCES insight_runs(id) ON DELETE CASCADE,
    cluster_id INTEGER NOT NULL REFERENCES transaction_clusters(id) ON DELETE CASCADE,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    distance NUMERIC(12, 6),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(run_id, transaction_id)
);

CREATE TABLE IF NOT EXISTS insight_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER NOT NULL REFERENCES insight_runs(id) ON DELETE CASCADE,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
    clusters JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_insight_runs_user_started
ON insight_runs(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_findings_user_created
ON pattern_findings(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_clusters_user_created
ON transaction_clusters(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cluster_members_run
ON transaction_cluster_members(run_id);

CREATE INDEX IF NOT EXISTS idx_insight_snapshots_user_period
ON insight_snapshots(user_id, period_start, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_insight_user_state_updated
ON insight_user_state(updated_at DESC);
