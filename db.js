const { Pool } = require('pg');

const pool = new Pool({
    host: 'aws-1-ap-northeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.yynhflrsiamxenkvgsed',
    password: 'Bb99405012!QAZ',
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;