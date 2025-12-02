import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Helper to create Admin Client
async function createAdminClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = (page - 1) * limit

        // 1. Verify Session
        const supabase = await createClient()
        if (!supabase) return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id

        // 2. Fetch Contacts using Admin Client (bypassing RLS)
        const adminSupabase = await createAdminClient()

        // Get total count first
        const { count, error: countError } = await adminSupabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        if (countError) {
            console.error("Database count error:", countError)
            return NextResponse.json({ error: countError.message }, { status: 500 })
        }

        // Get paginated data
        const { data: contacts, error: dbError } = await adminSupabase
            .from('contacts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (dbError) {
            console.error("Database error:", dbError)
            return NextResponse.json({ error: dbError.message }, { status: 500 })
        }

        return NextResponse.json({
            contacts: contacts || [],
            total: count || 0,
            page,
            totalPages: Math.ceil((count || 0) / limit)
        })

    } catch (error: any) {
        console.error('Contacts fetch error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
