const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local manually
try {
    const envConfig = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes
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

async function inspectContacts() {
    console.log('Inspecting contacts table...');

    // 1. Total Count
    const { count: total, error: countError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting contacts:', countError);
        return;
    }
    console.log(`Total Contacts: ${total}`);

    // 2. Count with LinkedIn URL
    const { count: withUrl, error: urlError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .not('linkedin_url', 'is', null)
        .neq('linkedin_url', '');

    if (urlError) {
        console.error('Error counting URLs:', urlError);
        return;
    }
    console.log(`Contacts with LinkedIn URL: ${withUrl}`);
    console.log(`Contacts WITHOUT LinkedIn URL: ${total - withUrl}`);

    // 3. Sample of missing URL contacts
    if (total - withUrl > 0) {
        console.log('\nSample of contacts WITHOUT LinkedIn URL:');
        const { data: sample, error: sampleError } = await supabase
            .from('contacts')
            .select('first_name, last_name, email, company, position, linkedin_url')
            .or('linkedin_url.is.null,linkedin_url.eq.""')
            .limit(5);

        if (sampleError) {
            console.error('Error fetching sample:', sampleError);
        } else {
            console.table(sample);
        }
    }
}

inspectContacts();
