const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserProfilesTable() {
    console.log('--- Checking user_profiles Table ---\n');

    try {
        // Try to query the table
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .limit(1);

        if (error) {
            if (error.message.includes('does not exist')) {
                console.log('❌ Table does NOT exist');
                console.log('   Need to create user_profiles table');
                return false;
            } else {
                console.error('Error querying table:', error.message);
                return false;
            }
        }

        console.log('✅ Table EXISTS');
        console.log(`   Sample data (first row):`, data[0] || 'No rows yet');
        return true;

    } catch (err) {
        console.error('Unexpected error:', err);
        return false;
    }
}

checkUserProfilesTable();
