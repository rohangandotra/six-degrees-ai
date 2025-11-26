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

// POST - Search for users to connect with
export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
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
    const adminSupabase = await createAdminClient()

    // Search users by name or email
    const { data: users, error } = await adminSupabase
      .from('users')
      .select('id, email, full_name')
      .neq('id', userId) // Exclude self
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20)

    if (error) {
      console.error('Error searching users:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Get existing connections to filter out
    const { data: connections } = await adminSupabase
      .from('user_connections')
      .select('user_id, connected_user_id')
      .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)

    const connectedUserIds = new Set(
      (connections || []).flatMap((c: any) => [c.user_id, c.connected_user_id])
    )

    // Filter out already connected users
    const filteredUsers = (users || [])
      .filter((user: any) => !connectedUserIds.has(user.id))
      .map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name
      }))

    return NextResponse.json({ users: filteredUsers })

  } catch (error: any) {
    console.error('User search error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
