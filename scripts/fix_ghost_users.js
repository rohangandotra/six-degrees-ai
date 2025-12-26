
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ghostUsers = [
    {
        id: '07548e05-2dc6-4ec2-a1a5-72296d81b48c',
        email: 'sahilhooda0316@gmail.com',
        full_name: 'Sahil Hooda',
        created_at: '2025-11-30T05:08:52Z',
        email_verified: false
    },
    {
        id: '5cbf64c3-bf73-479f-a77e-7d321b82edc0',
        email: 'ibrahimsalmanz1998@gmail.com',
        full_name: 'Ibrahim Salman',
        created_at: '2025-11-29T23:00:51Z',
        email_verified: true
    },
    {
        id: '75b75a75-1cc8-4db6-9ee2-a6b23ad93cbe',
        email: 'ajkumar4888@gmail.com',
        full_name: 'Ajay Kumar',
        created_at: '2025-11-28T00:37:11Z',
        email_verified: true
    },
    {
        id: '4ddb6db7-a448-4f5d-9262-b2989bdbd676',
        email: 'mujtaba2397@gmail.com',
        full_name: 'Mujtaba Aslam',
        created_at: '2025-11-27T12:10:28Z',
        email_verified: true
    }
];

async function fixGhostUsers() {
    console.log('🔧 Fixing 4 Ghost Users...\n');

    for (const user of ghostUsers) {
        const { error } = await supabase.from('users').upsert({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            created_at: user.created_at,
            email_verified: user.email_verified,
            password_hash: 'supabase_auth'
        }, { onConflict: 'id' });

        if (error) {
            console.error(`❌ Failed to fix ${user.email}:`, error.message);
        } else {
            console.log(`✅ Fixed: ${user.full_name} (${user.email})`);
        }
    }

    console.log('\n🎉 Ghost users fixed! They should now appear in your app.');
}

fixGhostUsers();
