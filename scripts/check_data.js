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

async function checkData() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query(`
      SELECT full_name, linkedin_url, email 
      FROM contacts 
      LIMIT 10;
    `);

        console.log('Sample Contacts:');
        res.rows.forEach(row => {
            console.log(`Name: ${row.full_name}, LinkedIn: ${row.linkedin_url || 'NULL'}, Email: ${row.email}`);
        });

        const countRes = await client.query(`
      SELECT COUNT(*) as total, COUNT(linkedin_url) as with_linkedin 
      FROM contacts;
    `);
        console.log('Stats:', countRes.rows[0]);

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

checkData();
