const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumns() {
    console.log('Checking columns...');

    const tables = ['contacts', 'profiles'];

    for (const table of tables) {
        console.log(`\n--- ${table} ---`);
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.log(`Error: ${error.message}`);
        } else if (data && data.length > 0) {
            console.log(Object.keys(data[0]));
        } else {
            console.log('Table empty, cannot infer columns from data.');
            // Try inserting a dummy row to see error? No, risky.
        }
    }
}

checkColumns();
