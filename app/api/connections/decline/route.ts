import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID } from '@/lib/security'

/**
 * Decline a connection request
 * POST /api/connections/decline
 *
 * Body:
 * - connectionId: ID of connection to decline
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { connectionId } = body

    if (!connectionId || !isValidUUID(connectionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid connection ID' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: connection, error } = await supabase
      .from('user_connections')
      .update({
        status: 'declined',
        declined_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .select()
      .single()

    if (error) {
      console.error('Error declining connection:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to decline connection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Connection request declined'
    })

  } catch (error) {
    console.error('Error in decline connection:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
