import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID, logSecurityEvent } from '@/lib/security'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { connectionId, shareNetwork = true } = body

    if (!connectionId) {
      return NextResponse.json(
        { success: false, message: 'connectionId is required' },
        { status: 400 }
      )
    }

    if (!isValidUUID(connectionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid connectionId' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get the connection to verify it exists and is pending
    const { data: connection, error: fetchError } = await supabase
      .from('user_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (fetchError || !connection) {
      return NextResponse.json(
        { success: false, message: 'Connection request not found' },
        { status: 404 }
      )
    }

    if (connection.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Connection request is not pending' },
        { status: 400 }
      )
    }

    // Accept the connection
    const { data: updated, error } = await supabase
      .from('user_connections')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepter_shares_network: shareNetwork
      })
      .eq('id', connectionId)
      .select()
      .single()

    if (error) {
      console.error('Error accepting connection:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to accept connection' },
        { status: 500 }
      )
    }

    logSecurityEvent({
      type: 'connection_accepted',
      userId: connection.connected_user_id,
      details: `Accepted connection from ${connection.user_id}`,
      severity: 'low'
    })

    // TODO: Send email notification to requester

    return NextResponse.json({
      success: true,
      message: 'Connection accepted successfully',
      connection: updated
    })

  } catch (error: any) {
    console.error('Accept connection error:', error)
    logSecurityEvent({
      type: 'connection_accept_error',
      details: error.message,
      severity: 'high'
    })

    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
