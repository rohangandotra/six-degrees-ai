const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigate() {
    console.log('--- Investigating Connection Request ---\n');

    // 1. Get Rohan's ID (Auth ID)
    const { data: rohan } = await supabase.from('users').select('id').eq('email', 'rohan.gandotra19@gmail.com').single();

    if (!rohan) {
        console.error('❌ Could not find Rohan user!');
    } else {
        console.log(`Rohan ID: ${rohan.id}`);

        // 2. Search for ANY connection involving Rohan
        const { data: connections, error } = await supabase
            .from('user_connections')
            .select(`
        id, 
        status, 
        created_at,
        connected_user:users!user_connections_connected_user_id_fkey(email, full_name)
      `)
            .eq('user_id', rohan.id);

        if (error) {
            console.error('Error fetching connections:', error);
        } else {
            console.log(`Found ${connections.length} outgoing requests from Rohan:`);
            connections.forEach(c => {
                console.log(`- To: ${c.connected_user?.full_name} (${c.connected_user?.email}) | Status: ${c.status} | At: ${c.created_at}`);
            });
        }
    }

    console.log('\n--- Testing Password Reset Link Generation ---\n');

    const email = 'rohan.gandotra19@gmail.com';
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email
    });

    if (linkError) {
        console.error('❌ Failed to generate reset link:', linkError.message);
    } else {
        console.log('✅ Successfully generated reset link (System works, email delivery is the issue):');
        console.log(`   URL: ${linkData.properties.action_link}`);
        console.log(`   (This proves the backend can create tokens, but the email service is failing)`);
    }
}

investigate();
