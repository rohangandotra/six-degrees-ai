import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID } from '@/lib/security'

/**
 * Update network sharing preference for a connection
 * PUT /api/connections/update-sharing
 *
 * Body:
 * - connectionId: ID of the connection
 * - userId: Current user's ID (to determine if requester or accepter)
 * - shareNetwork: Boolean - whether to share network
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { connectionId, userId, shareNetwork } = body

    if (!connectionId || !isValidUUID(connectionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid connection ID' },
        { status: 400 }
      )
    }

    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID' },
        { status: 400 }
      )
    }

    if (typeof shareNetwork !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'shareNetwork must be a boolean' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get the connection to determine user's role
    const { data: connection, error: fetchError } = await supabase
      .from('user_connections')
      .select('user_id, connected_user_id')
      .eq('id', connectionId)
      .single()

    if (fetchError || !connection) {
      return NextResponse.json(
        { success: false, message: 'Connection not found' },
        { status: 404 }
      )
    }

    // Determine which field to update based on user's role
    let updateField: string
    if (connection.user_id === userId) {
      // User is the requester
      updateField = 'requester_shares_network'
    } else if (connection.connected_user_id === userId) {
      // User is the accepter
      updateField = 'accepter_shares_network'
    } else {
      return NextResponse.json(
        { success: false, message: 'User is not part of this connection' },
        { status: 403 }
      )
    }

    // Update the appropriate sharing field
    const { data: updated, error: updateError } = await supabase
      .from('user_connections')
      .update({ [updateField]: shareNetwork })
      .eq('id', connectionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating sharing preference:', updateError)
      return NextResponse.json(
        { success: false, message: 'Failed to update sharing preference' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: shareNetwork ? 'Network sharing enabled' : 'Network sharing disabled',
      connection: updated
    })

  } catch (error) {
    console.error('Error in update sharing:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
