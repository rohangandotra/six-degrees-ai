const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ROHAN_ID = '96f99bc7-4d86-4655-887b-0e836c967231';
const MOHAMMED_ID = '748729fd-9131-48a9-8b3b-3c90348bba66';
const AKHTAR_ID = '3cebe82e-5786-4d9e-95b8-840725e95ca5';

async function debugConnection() {
    console.log('Debugging connection request...\n');

    // 1. Check for existing connections
    console.log('Checking existing connections for Rohan...');

    const { data: connections, error } = await supabase
        .from('user_connections')
        .select('*')
        .or(`user_id.eq.${ROHAN_ID},connected_user_id.eq.${ROHAN_ID}`);

    if (error) {
        console.error('Error fetching connections:', error);
    } else {
        console.log(`Found ${connections.length} connections involving Rohan.`);
        connections.forEach(c => {
            console.log(`- ${c.user_id} <-> ${c.connected_user_id} (${c.status})`);
        });
    }

    // 2. Simulate the check logic from the API
    console.log('\nSimulating API check logic for Mohammed Baig...');
    const targetId = MOHAMMED_ID; // Try Mohammed first

    const { data: existing, error: checkError } = await supabase
        .from('user_connections')
        .select('id, status')
        .or(`and(user_id.eq.${ROHAN_ID},connected_user_id.eq.${targetId}),and(user_id.eq.${targetId},connected_user_id.eq.${ROHAN_ID})`)
        .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Check query error:', checkError);
    } else if (existing) {
        console.log(`⚠️ Connection ALREADY EXISTS with Mohammed: ${existing.status}`);
    } else {
        console.log('✅ No existing connection found with Mohammed. Request should succeed.');
    }

    console.log('\nSimulating API check logic for Akhtar Mirza...');
    const targetId2 = AKHTAR_ID;

    const { data: existing2, error: checkError2 } = await supabase
        .from('user_connections')
        .select('id, status')
        .or(`and(user_id.eq.${ROHAN_ID},connected_user_id.eq.${targetId2}),and(user_id.eq.${targetId2},connected_user_id.eq.${ROHAN_ID})`)
        .single();

    if (checkError2 && checkError2.code !== 'PGRST116') {
        console.error('Check query error:', checkError2);
    } else if (existing2) {
        console.log(`⚠️ Connection ALREADY EXISTS with Akhtar: ${existing2.status}`);
    } else {
        console.log('✅ No existing connection found with Akhtar. Request should succeed.');
    }
}

debugConnection();
