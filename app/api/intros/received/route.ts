import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID } from '@/lib/security'

/**
 * Get introduction requests received by user
 * GET /api/intros/received?userId=xxx&status=pending
 *
 * Returns list of intro requests others want this user to make
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') || null

    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    let query = supabase
      .from('intro_requests')
      .select(`
        *,
        requester:users!intro_requests_requester_id_fkey(id, full_name, email, organization)
      `)
      .eq('connector_id', userId)
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (status && ['pending', 'accepted', 'declined', 'completed'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('Error fetching received intro requests:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to fetch intro requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      requests: requests || []
    })

  } catch (error) {
    console.error('Error in received intro requests:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
