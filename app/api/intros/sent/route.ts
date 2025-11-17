import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID } from '@/lib/security'

/**
 * Get introduction requests sent by user
 * GET /api/intros/sent?userId=xxx
 *
 * Returns list of intro requests the user has made
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: requests, error } = await supabase
      .from('intro_requests')
      .select(`
        *,
        connector:users!intro_requests_connector_id_fkey(id, full_name, email, organization)
      `)
      .eq('requester_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sent intro requests:', error)
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
    console.error('Error in sent intro requests:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
