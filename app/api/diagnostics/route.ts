import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        environment_variables: {
            OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            SUPABASE_URL: !!process.env.SUPABASE_URL,
        },
        values: {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            SUPABASE_URL: process.env.SUPABASE_URL,
        }
    }

    // Test Supabase Client
    try {
        const supabase = await createClient()
        const { data: { session }, error } = await supabase.auth.getSession()

        diagnostics.supabase_client = {
            created: !!supabase,
            session_check_error: error?.message || null,
            has_session: !!session,
            user_id: session?.user?.id || null
        }
    } catch (error: any) {
        diagnostics.supabase_client = {
            error: error.message
        }
    }

    // Test Admin Client
    try {
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
        const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data, error } = await adminClient.from('user_contacts').select('count').limit(1)

        diagnostics.admin_client = {
            created: !!adminClient,
            test_query_error: error?.message || null,
            can_query_db: !error
        }
    } catch (error: any) {
        diagnostics.admin_client = {
            error: error.message
        }
    }

    return NextResponse.json(diagnostics, { status: 200 })
}
