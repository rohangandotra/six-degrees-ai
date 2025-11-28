const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Missing DATABASE_URL in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function addEnrichmentColumns() {
    try {
        await client.connect();
        console.log('Connected to database.');

        // Add enrichment columns
        await client.query(`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS skills TEXT[],
      ADD COLUMN IF NOT EXISTS experience JSONB,
      ADD COLUMN IF NOT EXISTS personal_email TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
    `);
        console.log('Added enrichment columns: skills, experience, personal_email, phone, enriched_at');

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

addEnrichmentColumns();
