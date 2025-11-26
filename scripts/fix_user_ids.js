const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateUserIds() {
    console.log('Starting User ID Migration (Final Strategy)...\n');

    // 1. Fetch all Auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        return;
    }
    console.log(`Found ${authUsers.length} auth users.`);

    // 2. Fetch all Public users
    const { data: publicUsers, error: publicError } = await supabase
        .from('users')
        .select('*');
    if (publicError) {
        console.error('❌ Error fetching public users:', publicError);
        return;
    }
    console.log(`Found ${publicUsers.length} public users.\n`);

    // 3. Iterate and fix
    for (const authUser of authUsers) {
        const publicUser = publicUsers.find(u => u.email.toLowerCase() === authUser.email.toLowerCase());

        if (!publicUser) {
            console.log(`⚠️  Auth user ${authUser.email} has NO public profile. Creating one...`);
            // Check if already exists by ID (maybe created in previous run?)
            const { data: existingById } = await supabase.from('users').select('id').eq('id', authUser.id).single();
            if (existingById) {
                console.log(`   ✅ Profile already exists with correct ID.`);
                continue;
            }

            const { error } = await supabase.from('users').insert({
                id: authUser.id,
                email: authUser.email,
                full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
                created_at: authUser.created_at,
                password_hash: 'migrated_auth_user',
                is_verified: true,
                email_verified: true,
                plan_tier: 'free'
            });
            if (error) console.error(`   ❌ Failed to create profile: ${error.message}`);
            else console.log(`   ✅ Created profile for ${authUser.email}`);
            continue;
        }

        if (publicUser.id === authUser.id) {
            console.log(`✅ ${authUser.email}: IDs match.`);
            continue;
        }

        console.log(`🔄 ${authUser.email}: ID MISMATCH!`);
        console.log(`   Auth ID:   ${authUser.id}`);
        console.log(`   Public ID: ${publicUser.id}`);
        console.log(`   Migrating data...`);

        const oldId = publicUser.id;
        const newId = authUser.id;

        // A. Rename Old User Email (to free up the email)
        const tempEmail = `temp_${oldId}_${publicUser.email}`;
        const { error: renameError } = await supabase
            .from('users')
            .update({ email: tempEmail })
            .eq('id', oldId);

        if (renameError) {
            console.error(`   ❌ Error renaming old email: ${renameError.message}`);
            continue; // Skip if we can't rename
        }
        console.log(`   ✅ Renamed old email to ${tempEmail}`);

        // B. Create New User Row
        const { error: insertError } = await supabase.from('users').insert({
            id: newId, // Use NEW ID
            email: publicUser.email, // Use ORIGINAL email
            full_name: publicUser.full_name,
            password_hash: publicUser.password_hash || 'migrated_auth_user',
            created_at: publicUser.created_at,
            last_login: publicUser.last_login,
            is_verified: true,
            plan_tier: publicUser.plan_tier || 'free',
            organization: publicUser.organization,
            email_verified: true
        });

        if (insertError) {
            console.error(`   ❌ Error creating new user row: ${insertError.message}`);
            // Revert email rename
            await supabase.from('users').update({ email: publicUser.email }).eq('id', oldId);
            continue;
        } else {
            console.log(`   ✅ Created new user row with correct ID.`);
        }

        // C. Update Contacts
        const { count: contactsCount, error: contactsError } = await supabase
            .from('contacts')
            .update({ user_id: newId })
            .eq('user_id', oldId)
            .select('id', { count: 'exact' });

        if (contactsError) console.error(`   ❌ Error migrating contacts: ${contactsError.message}`);
        else console.log(`   ✅ Migrated ${contactsCount} contacts.`);

        // D. Update Connections (as requester)
        const { count: connReqCount, error: connReqError } = await supabase
            .from('user_connections')
            .update({ user_id: newId })
            .eq('user_id', oldId)
            .select('id', { count: 'exact' });

        if (connReqError) console.error(`   ❌ Error migrating connections (requester): ${connReqError.message}`);
        else console.log(`   ✅ Migrated ${connReqCount} connections (as requester).`);

        // E. Update Connections (as accepter)
        const { count: connAccCount, error: connAccError } = await supabase
            .from('user_connections')
            .update({ connected_user_id: newId })
            .eq('connected_user_id', oldId)
            .select('id', { count: 'exact' });

        if (connAccError) console.error(`   ❌ Error migrating connections (accepter): ${connAccError.message}`);
        else console.log(`   ✅ Migrated ${connAccCount} connections (as accepter).`);

        // F. Delete Old User Row
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', oldId);

        if (deleteError) console.error(`   ❌ Error deleting old user row: ${deleteError.message}`);
        else console.log(`   ✅ Deleted old user row.`);
    }
}

migrateUserIds();
