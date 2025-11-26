const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ROHAN_ID = '96f99bc7-4d86-4655-887b-0e836c967231';

async function calculateStats() {
    console.log('--- Calculating Stats for Rohan ---\n');

    // 1. Own Contacts
    const { count: ownContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ROHAN_ID);

    console.log(`Own Contacts: ${ownContacts}`);

    // 2. Connections
    const { data: asRequester } = await supabase
        .from('user_connections')
        .select('connected_user_id, accepter_shares_network, status')
        .eq('user_id', ROHAN_ID);

    const { data: asAccepter } = await supabase
        .from('user_connections')
        .select('user_id, requester_shares_network, status')
        .eq('connected_user_id', ROHAN_ID);

    console.log('\nConnections (Raw):');
    console.log('As Requester:', asRequester);
    console.log('As Accepter:', asAccepter);

    const acceptedAsRequester = asRequester?.filter(c => c.status === 'accepted') || [];
    const acceptedAsAccepter = asAccepter?.filter(c => c.status === 'accepted') || [];

    const directConnections = acceptedAsRequester.length + acceptedAsAccepter.length;
    console.log(`\nDirect Connections (Accepted): ${directConnections}`);

    // 3. Shared Contacts
    let sharedContacts = 0;

    for (const c of acceptedAsRequester) {
        if (c.accepter_shares_network) {
            const { count } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', c.connected_user_id);
            console.log(`+ Shared from ${c.connected_user_id}: ${count}`);
            sharedContacts += count || 0;
        } else {
            console.log(`- Connection ${c.connected_user_id} does NOT share network`);
        }
    }

    for (const c of acceptedAsAccepter) {
        if (c.requester_shares_network) {
            const { count } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', c.user_id);
            console.log(`+ Shared from ${c.user_id}: ${count}`);
            sharedContacts += count || 0;
        } else {
            console.log(`- Connection ${c.user_id} does NOT share network`);
        }
    }

    console.log(`\nTotal Shared Contacts: ${sharedContacts}`);
    console.log(`Total Accessible: ${ownContacts + sharedContacts}`);
}

calculateStats();
