import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
    // Verify user session
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // Admin client (service role) to bypass RLS
    const admin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: contacts, error } = await admin
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id);

    if (error) {
        console.error('Debug contacts fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contacts });
}
