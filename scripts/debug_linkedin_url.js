/**
 * Debug script to investigate LinkedIn URL issues for extended network contacts
 * 
 * This script checks:
 * 1. If contacts from a specific user have linkedin_url populated
 * 2. If contacts have embeddings (required for vector search)
 * 3. The state of user connections and network sharing
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local manually
try {
    const envConfig = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
    });
} catch (e) {
    console.error('Could not load .env.local', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLinkedInUrls() {
    console.log('='.repeat(60));
    console.log('LinkedIn URL Debug Script');
    console.log('='.repeat(60));

    // 1. Find the user ro.gandotra@gmail.com
    const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('email', 'ro.gandotra@gmail.com')
        .single();

    if (userError || !currentUser) {
        console.error('Could not find user ro.gandotra@gmail.com:', userError);
        return;
    }

    console.log('\n📧 Current User:', currentUser.email, `(${currentUser.id})`);

    // 2. Find user connections
    const { data: asRequester } = await supabase
        .from('user_connections')
        .select(`
            connected_user_id, 
            accepter_shares_network,
            status,
            connected_user:users!user_connections_connected_user_id_fkey(id, email, full_name)
        `)
        .eq('user_id', currentUser.id)
        .eq('status', 'accepted');

    const { data: asAccepter } = await supabase
        .from('user_connections')
        .select(`
            user_id, 
            requester_shares_network,
            status,
            requester:users!user_connections_user_id_fkey(id, email, full_name)
        `)
        .eq('connected_user_id', currentUser.id)
        .eq('status', 'accepted');

    console.log('\n🔗 User Connections:');
    console.log(`  As Requester: ${asRequester?.length || 0} connections`);
    console.log(`  As Accepter: ${asAccepter?.length || 0} connections`);

    // Find Anirudh Madhok's user ID
    let anirudhUserId = null;
    let sharingEnabled = false;

    if (asRequester) {
        for (const conn of asRequester) {
            console.log(`\n  → ${conn.connected_user?.full_name} (${conn.connected_user?.email})`);
            console.log(`    Shares Network: ${conn.accepter_shares_network ? '✅' : '❌'}`);
            if (conn.connected_user?.full_name?.toLowerCase().includes('anirudh')) {
                anirudhUserId = conn.connected_user_id;
                sharingEnabled = conn.accepter_shares_network;
            }
        }
    }

    if (asAccepter) {
        for (const conn of asAccepter) {
            console.log(`\n  → ${conn.requester?.full_name} (${conn.requester?.email})`);
            console.log(`    Shares Network: ${conn.requester_shares_network ? '✅' : '❌'}`);
            if (conn.requester?.full_name?.toLowerCase().includes('anirudh')) {
                anirudhUserId = conn.user_id;
                sharingEnabled = conn.requester_shares_network;
            }
        }
    }

    if (!anirudhUserId) {
        console.log('\n⚠️  Could not find Anirudh Madhok in connections. Let\'s search for the user directly...');

        const { data: anirudhUser } = await supabase
            .from('users')
            .select('id, email, full_name')
            .ilike('full_name', '%anirudh%')
            .limit(5);

        if (anirudhUser && anirudhUser.length > 0) {
            console.log('\n  Found users with "anirudh" in name:');
            anirudhUser.forEach(u => console.log(`    - ${u.full_name} (${u.email}) [${u.id}]`));
            anirudhUserId = anirudhUser[0].id;
        }
    }

    if (!anirudhUserId) {
        console.error('Could not find Anirudh Madhok\'s user ID');
        return;
    }

    console.log(`\n🔍 Anirudh's User ID: ${anirudhUserId}`);
    console.log(`   Network sharing enabled: ${sharingEnabled ? '✅' : '❌'}`);

    // 3. Check Anirudh's contacts
    console.log('\n📇 Anirudh\'s Contacts Analysis:');

    const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', anirudhUserId);

    console.log(`   Total Contacts: ${totalContacts}`);

    const { count: withLinkedIn } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', anirudhUserId)
        .not('linkedin_url', 'is', null)
        .neq('linkedin_url', '');

    console.log(`   With LinkedIn URL: ${withLinkedIn}`);
    console.log(`   Without LinkedIn URL: ${totalContacts - withLinkedIn}`);

    const { count: withEmbedding } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', anirudhUserId)
        .not('embedding', 'is', null);

    console.log(`   With Embedding: ${withEmbedding}`);
    console.log(`   Without Embedding: ${totalContacts - withEmbedding}`);

    // 4. Sample of contacts with and without LinkedIn URLs
    console.log('\n📋 Sample Contacts WITH LinkedIn URL:');
    const { data: withUrlSample } = await supabase
        .from('contacts')
        .select('full_name, position, company, linkedin_url, source')
        .eq('user_id', anirudhUserId)
        .not('linkedin_url', 'is', null)
        .neq('linkedin_url', '')
        .limit(5);

    if (withUrlSample) {
        withUrlSample.forEach(c => {
            console.log(`   - ${c.full_name} (${c.source || 'unknown'})`);
            console.log(`     Position: ${c.position || 'N/A'}`);
            console.log(`     LinkedIn: ${c.linkedin_url}`);
        });
    }

    console.log('\n📋 Sample Contacts WITHOUT LinkedIn URL:');
    const { data: withoutUrlSample } = await supabase
        .from('contacts')
        .select('full_name, position, company, linkedin_url, source')
        .eq('user_id', anirudhUserId)
        .or('linkedin_url.is.null,linkedin_url.eq.')
        .limit(5);

    if (withoutUrlSample && withoutUrlSample.length > 0) {
        withoutUrlSample.forEach(c => {
            console.log(`   - ${c.full_name} (${c.source || 'unknown'})`);
            console.log(`     Position: ${c.position || 'N/A'}`);
            console.log(`     LinkedIn: ${c.linkedin_url || 'NULL/EMPTY'}`);
        });
    } else {
        console.log('   (All contacts have LinkedIn URLs)');
    }

    // 5. Check what source types exist
    console.log('\n📊 Contacts by Source:');
    const { data: allContacts } = await supabase
        .from('contacts')
        .select('source, linkedin_url')
        .eq('user_id', anirudhUserId);

    if (allContacts) {
        const sourceStats = {};
        allContacts.forEach(c => {
            const src = c.source || 'null';
            if (!sourceStats[src]) {
                sourceStats[src] = { total: 0, withUrl: 0 };
            }
            sourceStats[src].total++;
            if (c.linkedin_url && c.linkedin_url.trim() !== '') {
                sourceStats[src].withUrl++;
            }
        });

        for (const [source, stats] of Object.entries(sourceStats)) {
            console.log(`   ${source}: ${stats.total} total, ${stats.withUrl} with LinkedIn URL`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Debug complete.');
}

debugLinkedInUrls();
