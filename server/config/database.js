import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use DATABASE_URL if available (Neon/production), otherwise use individual vars (local Docker)
const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false // Required for Neon
            }
        }
        : {
            host: process.env.DB_HOST || 'postgres',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'portfoliio_db',
            user: process.env.DB_USER || 'portfoliio_user',
            password: process.env.DB_PASSWORD || 'portfoliio_password',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000
        }
);

// Test database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
});

export default pool;
