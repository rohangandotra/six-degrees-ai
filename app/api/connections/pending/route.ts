import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Helper to create Admin Client
async function createAdminClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// GET - Get pending connection requests
export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        if (!supabase) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
        }

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id
        const adminSupabase = await createAdminClient()

        // Get pending requests where user is the target
        const { data: requests, error } = await adminSupabase
            .from('user_connections')
            .select(`
        id,
        user_id,
        status,
        requested_at,
        request_message,
        requester:users!user_connections_user_id_fkey(id, email, full_name)
      `)
            .eq('connected_user_id', userId)
            .eq('status', 'pending')
            .order('requested_at', { ascending: false })

        if (error) {
            console.error('Error fetching pending requests:', error)
            return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
        }

        const formatted = (requests || []).map((req: any) => ({
            connection_id: req.id,
            requester_id: req.user_id,
            requester_email: req.requester.email,
            requester_name: req.requester.full_name,
            requested_at: req.requested_at,
            request_message: req.request_message
        }))

        return NextResponse.json({ requests: formatted })

    } catch (error: any) {
        console.error('Pending requests error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST - Accept or decline a connection request
export async function POST(request: Request) {
    try {
        const { connection_id, action, share_network = true } = await request.json()

        if (!connection_id || !action) {
            return NextResponse.json(
                { error: 'connection_id and action are required' },
                { status: 400 }
            )
        }

        if (!['accept', 'decline'].includes(action)) {
            return NextResponse.json({ error: 'action must be "accept" or "decline"' }, { status: 400 })
        }

        const supabase = await createClient()

        if (!supabase) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
        }

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminSupabase = await createAdminClient()

        if (action === 'accept') {
            const { error } = await adminSupabase
                .from('user_connections')
                .update({
                    status: 'accepted',
                    accepted_at: new Date().toISOString(),
                    accepter_shares_network: share_network
                })
                .eq('id', connection_id)
                .eq('connected_user_id', session.user.id) // Ensure user is the accepter

            if (error) {
                console.error('Error accepting connection:', error)
                return NextResponse.json({ error: 'Failed to accept request' }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                message: 'Connection accepted!'
            })
        } else {
            const { error } = await adminSupabase
                .from('user_connections')
                .update({
                    status: 'declined',
                    declined_at: new Date().toISOString()
                })
                .eq('id', connection_id)
                .eq('connected_user_id', session.user.id)

            if (error) {
                console.error('Error declining connection:', error)
                return NextResponse.json({ error: 'Failed to decline request' }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                message: 'Connection declined'
            })
        }

    } catch (error: any) {
        console.error('Request action error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
