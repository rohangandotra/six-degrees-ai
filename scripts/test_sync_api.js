const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSyncApi() {
    console.log('Testing Sync API Logic...');

    // 1. Get a valid user ID
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

    if (userError || !users || users.length === 0) {
        console.error('Could not find a user to test with.');
        return;
    }

    const userId = users[0].id;
    console.log(`Using User ID (API Key): ${userId}`);

    // 2. Simulate the API logic (since we can't fetch localhost easily from script without server running)
    // We will just run the logic directly to verify database interactions

    const contacts = [
        {
            name: "Test Extension Contact",
            headline: "AI Researcher at OpenAI",
            profileUrl: "https://linkedin.com/in/test-extension-contact",
            avatarUrl: "https://example.com/avatar.jpg",
            source: "linkedin_extension"
        }
    ];

    console.log('Simulating sync for contacts:', contacts);

    for (const contact of contacts) {
        const nameParts = contact.name.split(' ');
        const first_name = nameParts[0];
        const last_name = nameParts.slice(1).join(' ') || '';

        // Check existing
        const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('user_id', userId)
            .eq('linkedin_url', contact.profileUrl)
            .single();

        if (existing) {
            console.log('Contact already exists. Updating...');
            const { error: updateError } = await supabase
                .from('contacts')
                .update({
                    position: contact.headline,
                    avatar_url: contact.avatarUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);

            if (updateError) console.error('Update failed:', updateError);
            else console.log('Update successful.');
        } else {
            console.log('Inserting new contact...');
            const { error: insertError } = await supabase
                .from('contacts')
                .insert({
                    user_id: userId,
                    first_name,
                    last_name,
                    full_name: contact.name,
                    company: '',
                    position: contact.headline,
                    linkedin_url: contact.profileUrl,
                    avatar_url: contact.avatarUrl,
                    source: 'linkedin_extension',
                    email: '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (insertError) console.error('Insert failed:', insertError);
            else console.log('Insert successful.');
        }
    }
}

testSyncApi();
