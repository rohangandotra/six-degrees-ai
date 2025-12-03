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

// GET - Get user's network statistics
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
        console.log(`[Stats API] Fetching for User ID: ${userId}`)

        const adminSupabase = await createAdminClient()

        // 1. Count user's own contacts
        const { count: ownContactsCount } = await adminSupabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        // 2. Get accepted connections (Using exact same logic as connections API)
        const { data: asRequester, error: error1 } = await adminSupabase
            .from('user_connections')
            .select('connected_user_id, accepter_shares_network')
            .eq('user_id', userId)
            .eq('status', 'accepted')

        const { data: asAccepter, error: error2 } = await adminSupabase
            .from('user_connections')
            .select('user_id, requester_shares_network')
            .eq('connected_user_id', userId)
            .eq('status', 'accepted')

        if (error1 || error2) {
            console.error('Stats API Error:', error1 || error2)
        }

        // Total connections count
        const directConnectionsCount = (asRequester?.length || 0) + (asAccepter?.length || 0)
        console.log(`[Stats API] Direct Connections: ${directConnectionsCount}`)

        // 3. Calculate UNIQUE accessible contacts
        const contributingUserIds = [userId]

        // Add sharing requesters
        if (asRequester) {
            for (const conn of asRequester) {
                if (conn.accepter_shares_network) {
                    contributingUserIds.push(conn.connected_user_id)
                }
            }
        }

        // Add sharing accepters
        if (asAccepter) {
            for (const conn of asAccepter) {
                if (conn.requester_shares_network) {
                    contributingUserIds.push(conn.user_id)
                }
            }
        }

        // Fetch minimal data for deduplication
        // We fetch in chunks if needed, but for now assuming < 50k rows fits in memory
        // Fetch all contacts with pagination (Supabase defaults to 1000 rows)
        let allContacts: any[] = []
        const PAGE_SIZE = 1000
        let page = 0
        let hasMore = true

        while (hasMore) {
            const { data, error } = await adminSupabase
                .from('contacts')
                .select('linkedin_url, email')
                .in('user_id', contributingUserIds)
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

            if (error) {
                console.error('Error fetching contacts page:', error)
                throw error
            }

            if (data) {
                allContacts = [...allContacts, ...data]
                if (data.length < PAGE_SIZE) {
                    hasMore = false
                } else {
                    page++
                }
            } else {
                hasMore = false
            }
        }

        // Error handling is done inside the loop


        const uniqueContacts = new Set<string>()
        let unidentifiableCount = 0

        allContacts?.forEach(contact => {
            const hasUrl = contact.linkedin_url && contact.linkedin_url.trim() !== ''
            const hasEmail = contact.email && contact.email.trim() !== ''

            if (hasUrl) {
                uniqueContacts.add(`li:${contact.linkedin_url}`)
            } else if (hasEmail) {
                uniqueContacts.add(`email:${contact.email.toLowerCase()}`)
            } else {
                unidentifiableCount++
            }
        })

        const totalAccessibleContacts = uniqueContacts.size + unidentifiableCount

        // Shared is Total - Own (Approximation, since we can't easily know which unidentifiables are own vs shared without more logic)
        // A better approximation for shared: Total - Own. If negative (shouldn't be), 0.
        const sharedContactsCount = Math.max(0, totalAccessibleContacts - (ownContactsCount || 0))

        console.log(`[Stats API] Unique: ${uniqueContacts.size}, Unidentifiable: ${unidentifiableCount}, Total: ${totalAccessibleContacts}`)

        return NextResponse.json({
            userId: userId,
            ownContacts: ownContactsCount || 0,
            directConnections: directConnectionsCount,
            sharedContacts: sharedContactsCount,
            totalAccessibleContacts: totalAccessibleContacts
        })

    } catch (error: any) {
        console.error('Stats error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
