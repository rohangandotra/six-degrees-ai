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

async function fixSchema() {
    try {
        await client.connect();
        console.log('Connected to database.');

        // 1. Add Unique Constraint for LinkedIn URL
        console.log('Adding unique index on (user_id, linkedin_url)...');
        await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_user_linkedin 
      ON contacts (user_id, linkedin_url) 
      WHERE linkedin_url IS NOT NULL;
    `);

        // 2. Add Unique Constraint for Email (good practice)
        console.log('Adding unique index on (user_id, email)...');
        await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_user_email 
      ON contacts (user_id, email) 
      WHERE email IS NOT NULL;
    `);

        console.log('Schema updated successfully.');

    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        await client.end();
    }
}

fixSchema();
