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

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { share_network } = await request.json()

        if (typeof share_network !== 'boolean') {
            return NextResponse.json(
                { error: 'share_network must be a boolean' },
                { status: 400 }
            )
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
        const connectionId = params.id
        const adminSupabase = await createAdminClient()

        // Get connection to determine user's role
        const { data: conn, error: fetchError } = await adminSupabase
            .from('user_connections')
            .select('user_id, connected_user_id')
            .eq('id', connectionId)
            .single()

        if (fetchError || !conn) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
        }

        // Determine which field to update
        let fieldToUpdate: string
        if (conn.user_id === userId) {
            fieldToUpdate = 'requester_shares_network'
        } else if (conn.connected_user_id === userId) {
            fieldToUpdate = 'accepter_shares_network'
        } else {
            return NextResponse.json({ error: 'Not your connection' }, { status: 403 })
        }

        // Update sharing setting
        const { error: updateError } = await adminSupabase
            .from('user_connections')
            .update({ [fieldToUpdate]: share_network })
            .eq('id', connectionId)

        if (updateError) {
            console.error('Error updating sharing:', updateError)
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Sharing settings updated'
        })

    } catch (error: any) {
        console.error('Update sharing error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
