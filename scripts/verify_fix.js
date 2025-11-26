const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rohan's ID (Auth ID)
const ROHAN_ID = '96f99bc7-4d86-4655-887b-0e836c967231';
// Akhtar's ID (Auth ID - verified in migration)
const AKHTAR_ID = '3cebe82e-5786-4d9e-95b8-840725e95ca5';

async function verifyFix() {
    console.log('--- Verifying Connection Request Fix ---\n');

    // 1. Check if profiles exist (Root cause check)
    const { data: rohan } = await supabase.from('users').select('id').eq('id', ROHAN_ID).single();
    const { data: akhtar } = await supabase.from('users').select('id').eq('id', AKHTAR_ID).single();

    console.log(`Rohan Profile: ${rohan ? '✅ Exists' : '❌ MISSING'}`);
    console.log(`Akhtar Profile: ${akhtar ? '✅ Exists' : '❌ MISSING'}`);

    if (!rohan || !akhtar) {
        console.error('❌ Cannot proceed. Profiles are still missing.');
        return;
    }

    // 2. Attempt Insert (The actual test)
    console.log('\nAttempting to insert connection request...');

    const { data, error } = await supabase
        .from('user_connections')
        .insert({
            user_id: ROHAN_ID,
            connected_user_id: AKHTAR_ID,
            status: 'pending',
            requester_shares_network: true,
            accepter_shares_network: true,
            request_message: 'Verification test after fix'
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Insert FAILED:', error.message);
        if (error.code === '23505') console.log('(This might mean a request already exists, which is also a good sign)');
    } else {
        console.log('✅ Insert SUCCEEDED!', data);
        console.log('   (This proves the "Red Box" error is resolved)');

        // Cleanup
        console.log('Cleaning up test data...');
        await supabase.from('user_connections').delete().eq('id', data.id);
        console.log('✅ Cleanup complete.');
    }
}

verifyFix();
