const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listTables() {
    console.log('Listing tables...');

    // We can't list tables directly via JS client easily without rpc, 
    // but we can try to select from likely candidates to see which one doesn't error.

    const candidates = ['user_contacts', 'user_connections', 'contacts', 'connections', 'profiles'];

    for (const table of candidates) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (!error) {
            console.log(`✅ Table found: ${table}`);
        } else {
            console.log(`❌ Table not found: ${table} (${error.message})`);
        }
    }
}

listTables();
