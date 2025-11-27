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

// GET - Get user's connections
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

        // Get connections where user is the requester
        const { data: asRequester, error: error1 } = await adminSupabase
            .from('user_connections')
            .select(`
        id,
        user_id,
        connected_user_id,
        status,
        requester_shares_network,
        accepter_shares_network,
        accepted_at,
        created_at,
        connected_user:users!user_connections_connected_user_id_fkey(id, email, full_name)
      `)
            .eq('user_id', userId)
            .eq('status', 'accepted')

        // Get connections where user is the accepter
        const { data: asAccepter, error: error2 } = await adminSupabase
            .from('user_connections')
            .select(`
        id,
        user_id,
        connected_user_id,
        status,
        requester_shares_network,
        accepter_shares_network,
        accepted_at,
        created_at,
        requester_user:users!user_connections_user_id_fkey(id, email, full_name)
      `)
            .eq('connected_user_id', userId)
            .eq('status', 'accepted')

        if (error1 || error2) {
            console.error('Error fetching connections:', error1 || error2)
            return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
        }

        // Format connections
        const connections = [
            ...(asRequester || []).map((conn: any) => ({
                connection_id: conn.id,
                user_id: conn.connected_user_id,
                email: conn.connected_user.email,
                full_name: conn.connected_user.full_name,
                network_sharing_enabled: conn.accepter_shares_network, // Does OTHER user share?
                i_share_network: conn.requester_shares_network, // Do I share?
                connected_at: conn.accepted_at || conn.created_at,
                role: 'requester' as const
            })),
            ...(asAccepter || []).map((conn: any) => ({
                connection_id: conn.id,
                user_id: conn.user_id,
                email: conn.requester_user.email,
                full_name: conn.requester_user.full_name,
                network_sharing_enabled: conn.requester_shares_network, // Does OTHER user share?
                i_share_network: conn.accepter_shares_network, // Do I share?
                connected_at: conn.accepted_at || conn.created_at,
                role: 'accepter' as const
            }))
        ]

        return NextResponse.json({ connections })

    } catch (error: any) {
        console.error('Connections error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST - Send connection request
export async function POST(request: Request) {
    try {
        const { target_user_id, message } = await request.json()

        if (!target_user_id) {
            return NextResponse.json({ error: 'target_user_id is required' }, { status: 400 })
        }

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

        // JIT: Ensure requester exists in public.users to prevent FK violation
        const { data: requesterExists } = await adminSupabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single()

        if (!requesterExists) {
            console.log('[Connection API] Requester missing in public.users, syncing now:', userId)
            const { error: syncError } = await adminSupabase
                .from('users')
                .insert({
                    id: userId,
                    email: session.user.email,
                    full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                    password_hash: 'managed_by_supabase_auth' // Dummy value
                })

            if (syncError) {
                console.error('[Connection API] Failed to sync requester:', syncError)
                // We continue anyway, hoping it might work or fail with a clear error
            }
        }

        // Check if connection already exists
        const { data: existing } = await adminSupabase
            .from('user_connections')
            .select('id, status')
            .or(`and(user_id.eq.${userId},connected_user_id.eq.${target_user_id}),and(user_id.eq.${target_user_id},connected_user_id.eq.${userId})`)
            .single()

        if (existing) {
            return NextResponse.json(
                { error: `Connection already ${existing.status}` },
                { status: 400 }
            )
        }

        // Create connection request
        const { data: connection, error } = await adminSupabase
            .from('user_connections')
            .insert({
                user_id: userId,
                connected_user_id: target_user_id,
                status: 'pending',
                requester_shares_network: true,
                accepter_shares_network: true,
                request_message: message || null
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating connection:', error)
            return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
        }

        // Send email notification (fire and forget - don't block response)
        try {
            // Fetch recipient email first (we only had ID)
            const { data: recipient } = await adminSupabase
                .from('users')
                .select('email')
                .eq('id', target_user_id)
                .single()

            if (recipient?.email) {
                const { sendEmail, getConnectionRequestTemplate } = await import('@/lib/email')
                const { data: sender } = await adminSupabase
                    .from('users')
                    .select('full_name')
                    .eq('id', userId)
                    .single()

                const senderName = sender?.full_name || 'A user'
                const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sixthdegree.app'}/dashboard/network`

                // We don't await this to speed up the response, or we await it but catch errors
                await sendEmail({
                    to: recipient.email,
                    subject: `${senderName} wants to connect on Sixth Degree`,
                    html: getConnectionRequestTemplate(senderName, dashboardUrl)
                })
            }
        } catch (emailError) {
            // Log but don't fail the request
            console.error('Failed to send connection request email:', emailError)
        }

        return NextResponse.json({
            success: true,
            connection_id: connection.id,
            message: 'Connection request sent!'
        })

    } catch (error: any) {
        console.error('Send request error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
