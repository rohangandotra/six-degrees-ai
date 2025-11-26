const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const AKHTAR_ID = '3cebe82e-5786-4d9e-95b8-840725e95ca5'; // From previous steps

async function checkPending() {
    console.log('--- Checking Pending Requests for Mirza ---\n');

    // 1. Fetch requests where Mirza is the recipient (connected_user_id)
    const { data: requests, error } = await supabase
        .from('user_connections')
        .select(`
      id,
      status,
      created_at,
      user_id,
      requester:users!user_connections_user_id_fkey(full_name, email)
    `)
        .eq('connected_user_id', AKHTAR_ID)
        .eq('status', 'pending');

    if (error) {
        console.error('❌ Error fetching requests:', error);
        return;
    }

    console.log(`Found ${requests.length} pending requests for Mirza:`);
    requests.forEach(r => {
        console.log(`- From: ${r.requester?.full_name} (${r.requester?.email}) | ID: ${r.id} | At: ${r.created_at}`);
    });

    if (requests.length === 0) {
        console.log('\n⚠️  No pending requests found in DB.');
        console.log('   Hypothesis: The user tried to send it BEFORE the fix (got red box), and hasn\'t retried since.');
        console.log('   Action: Ask user to click "Connect" again.');
    }
}

checkPending();
