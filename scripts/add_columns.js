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

async function addColumns() {
    try {
        await client.connect();
        console.log('Connected to database.');

        // Add linkedin_url column
        await client.query(`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
    `);
        console.log('Added linkedin_url column.');

        // Add avatar_url column
        await client.query(`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);
        console.log('Added avatar_url column.');

        // Add source column if not exists
        await client.query(`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS source TEXT;
    `);
        console.log('Added source column.');

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

addColumns();
