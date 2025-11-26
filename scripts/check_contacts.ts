import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const { data, error, count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .limit(1);

    if (error) {
        console.error('Error fetching contacts:', error);
        process.exit(1);
    }
    console.log('Total contacts count:', count);
    console.log('Sample contact:', data?.[0] ?? 'none');
}

main();
