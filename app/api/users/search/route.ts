import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeSearchQuery, checkRateLimit, RATE_LIMITS } from '@/lib/security'

/**
 * Search for users by name or organization
 * POST /api/users/search
 *
 * Body:
 * - query: Search query (name or organization)
 * - currentUserId: Current user's ID (to exclude from results)
 * - limit: Max results to return (default: 20)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query, currentUserId, limit = 20 } = body

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Search query is required' },
        { status: 400 }
      )
    }

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Rate limiting: 30 searches per minute
    const rateLimit = checkRateLimit(`user-search:${currentUserId}`, {
      maxRequests: 30,
      windowMs: 1 * 60 * 1000
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many search requests' },
        { status: 429 }
      )
    }

    const sanitizedQuery = sanitizeSearchQuery(query)
    const supabase = createAdminClient()

    // Search by full_name or organization
    // Use ilike for case-insensitive pattern matching
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, organization, created_at')
      .neq('id', currentUserId)
      .or(`full_name.ilike.%${sanitizedQuery}%,organization.ilike.%${sanitizedQuery}%`)
      .limit(limit)

    if (error) {
      console.error('Error searching users:', error)
      return NextResponse.json(
        { success: false, message: 'Search failed' },
        { status: 500 }
      )
    }

    // For each user, check if there's an existing connection
    const userIds = users?.map(u => u.id) || []

    if (userIds.length > 0) {
      const { data: connections } = await supabase
        .from('user_connections')
        .select('user_id, connected_user_id, status')
        .or(`and(user_id.eq.${currentUserId},connected_user_id.in.(${userIds.join(',')})),and(user_id.in.(${userIds.join(',')}),connected_user_id.eq.${currentUserId})`)

      // Map connection status to each user
      const usersWithStatus = users?.map(user => {
        const connection = connections?.find(
          c => (c.user_id === currentUserId && c.connected_user_id === user.id) ||
               (c.connected_user_id === currentUserId && c.user_id === user.id)
        )

        return {
          ...user,
          connection_status: connection?.status || null,
          is_connected: connection?.status === 'accepted'
        }
      })

      return NextResponse.json({
        success: true,
        users: usersWithStatus || []
      })
    }

    return NextResponse.json({
      success: true,
      users: users?.map(u => ({ ...u, connection_status: null, is_connected: false })) || []
    })

  } catch (error) {
    console.error('Error in user search:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
