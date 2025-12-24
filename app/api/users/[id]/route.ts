import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Admin client for fetching user data
async function createAdminClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Verify session
        const supabase = await createClient()
        if (!supabase) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: userId } = await params

        // Fetch user info with admin client
        const adminSupabase = await createAdminClient()

        const { data: user, error } = await adminSupabase
            .from('users')
            .select('id, full_name, linkedin_url, company, position')
            .eq('id', userId)
            .single()

        if (error || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({ user })

    } catch (error: any) {
        console.error('User fetch error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch user' },
            { status: 500 }
        )
    }
}
