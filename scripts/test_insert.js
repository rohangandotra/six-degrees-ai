const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ROHAN_ID = '96f99bc7-4d86-4655-887b-0e836c967231';
const MOHAMMED_ID = '748729fd-9131-48a9-8b3b-3c90348bba66';

async function testInsert() {
    console.log('Attempting to insert connection request...');

    const { data, error } = await supabase
        .from('user_connections')
        .insert({
            user_id: ROHAN_ID,
            connected_user_id: MOHAMMED_ID,
            status: 'pending',
            requester_shares_network: true,
            accepter_shares_network: true,
            request_message: 'Test request from script'
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Insert failed:', error);
    } else {
        console.log('✅ Insert succeeded!', data);

        // Cleanup
        console.log('Cleaning up...');
        await supabase.from('user_connections').delete().eq('id', data.id);
    }
}

testInsert();
