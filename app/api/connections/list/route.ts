import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID } from '@/lib/security'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId is required' },
        { status: 400 }
      )
    }

    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid userId' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get connections where user is the requester
    const { data: asRequester, error: reqError } = await supabase
      .from('user_connections')
      .select('*, users!user_connections_connected_user_id_fkey(id, email, full_name, organization)')
      .eq('user_id', userId)
      .eq('status', 'accepted')

    // Get connections where user is the accepter
    const { data: asAccepter, error: accError } = await supabase
      .from('user_connections')
      .select('*, users!user_connections_user_id_fkey(id, email, full_name, organization)')
      .eq('connected_user_id', userId)
      .eq('status', 'accepted')

    if (reqError || accError) {
      console.error('Error fetching connections:', reqError || accError)
      return NextResponse.json(
        { success: false, message: 'Failed to fetch connections' },
        { status: 500 }
      )
    }

    // Format connections
    const connections = [
      ...(asRequester || []).map(conn => ({
        connection_id: conn.id,
        user_id: conn.connected_user_id,
        full_name: (conn.users as any)?.full_name,
        email: (conn.users as any)?.email,
        organization: (conn.users as any)?.organization,
        network_sharing_enabled: conn.accepter_shares_network, // Does OTHER user share?
        accepted_at: conn.accepted_at,
        i_am_sharing: conn.requester_shares_network // Am I sharing?
      })),
      ...(asAccepter || []).map(conn => ({
        connection_id: conn.id,
        user_id: conn.user_id,
        full_name: (conn.users as any)?.full_name,
        email: (conn.users as any)?.email,
        organization: (conn.users as any)?.organization,
        network_sharing_enabled: conn.requester_shares_network, // Does OTHER user share?
        accepted_at: conn.accepted_at,
        i_am_sharing: conn.accepter_shares_network // Am I sharing?
      }))
    ]

    return NextResponse.json({
      success: true,
      connections,
      count: connections.length
    })

  } catch (error: any) {
    console.error('List connections error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
