const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role to bypass RLS for diagnostic, OR Anon to test RLS?
// We want to test if the *code* works. The code in route.ts uses `createClient` from `@/lib/supabase/server` which uses the USER session.
// To simulate that, we need a user session. That's hard to get in a script.
// So we will test with Service Role first to rule out Schema/Constraint issues.
// If that works, then it might be RLS.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUploadLogic() {
    console.log('Starting Diagnostic Test...');

    // 1. Test Connection
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (authError) {
        console.error('❌ Auth Connection Failed:', authError.message);
        return;
    }
    console.log('✅ Auth Connection Successful');

    // 2. Test Schema / Insertion
    const testContact = {
        user_id: users[0].id, // Use the first user found
        first_name: 'Test',
        last_name: 'Diagnostic',
        full_name: 'Test Diagnostic',
        email: 'test.diagnostic@example.com',
        company: 'Diagnostic Corp',
        position: 'Tester',
        linkedin_url: 'https://linkedin.com/in/test-diagnostic-' + Date.now(), // Unique URL
        source: 'own'
    };

    console.log('Attempting to insert test contact:', testContact.linkedin_url);

    const { data, error } = await supabase
        .from('contacts')
        .insert([testContact])
        .select();

    if (error) {
        console.error('❌ Insertion Failed:', error);
        console.error('Details:', error.details);
        console.error('Hint:', error.hint);
    } else {
        console.log('✅ Insertion Successful:', data);

        // Clean up
        await supabase.from('contacts').delete().eq('id', data[0].id);
        console.log('✅ Cleaned up test contact');
    }
}

testUploadLogic();
