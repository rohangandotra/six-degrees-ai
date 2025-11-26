import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const { data, error } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public');
    if (error) {
        console.error('Error listing tables:', error);
        process.exit(1);
    }
    console.log('Public tables:', data);
}

main();
