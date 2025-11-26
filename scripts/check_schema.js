const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('Checking user_connections table schema...\n');

    // Try to fetch one row to see the schema
    const { data, error } = await supabase
        .from('user_connections')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error querying user_connections:', error.message);
        console.log('\n⚠️  Table might not exist. Need to create it.');
    } else {
        console.log('✅ user_connections table exists!');
        if (data && data.length > 0) {
            console.log('\nSample row:');
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log('\n(Table is empty, but structure exists)');
        }
    }

    // Check users table
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .limit(1);

    if (!usersError) {
        console.log('\n✅ users table exists');
        if (users && users.length > 0) {
            console.log('Sample user:', users[0]);
        }
    } else {
        console.error('\n❌ Error with users table:', usersError.message);
    }
}

checkSchema();
