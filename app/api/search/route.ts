import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, RATE_LIMITS, isValidUUID, sanitizeSearchQuery, logSecurityEvent } from '@/lib/security'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, query, searchExtended = false } = body

    // Rate limiting
    const rateLimit = checkRateLimit(`search:${userId}`, RATE_LIMITS.search)
    if (!rateLimit.allowed) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        userId,
        details: 'Search rate limit exceeded',
        severity: 'medium'
      })

      return NextResponse.json(
        {
          success: false,
          message: 'Too many search requests. Please slow down.'
        },
        { status: 429 }
      )
    }

    // Validation
    if (!userId || !query) {
      return NextResponse.json(
        { success: false, message: 'userId and query are required' },
        { status: 400 }
      )
    }

    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid userId' },
        { status: 400 }
      )
    }

    // Sanitize query
    const sanitizedQuery = sanitizeSearchQuery(query)
    if (!sanitizedQuery) {
      return NextResponse.json(
        { success: false, message: 'Invalid search query' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    let allContacts: any[] = []

    // Get user's own contacts
    const { data: myContacts, error: myError } = await supabase
      .from('user_contacts')
      .select('*')
      .eq('user_id', userId)

    if (myError) {
      console.error('Error fetching contacts:', myError)
      return NextResponse.json(
        { success: false, message: 'Failed to search contacts' },
        { status: 500 }
      )
    }

    allContacts = myContacts || []

    // Search extended network if requested
    if (searchExtended) {
      // Get connections where user is requester AND accepter shares their network
      const { data: asRequester, error: reqError } = await supabase
        .from('user_connections')
        .select('connected_user_id, accepter_shares_network')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .eq('accepter_shares_network', true)

      // Get connections where user is accepter AND requester shares their network
      const { data: asAccepter, error: accError } = await supabase
        .from('user_connections')
        .select('user_id, requester_shares_network')
        .eq('connected_user_id', userId)
        .eq('status', 'accepted')
        .eq('requester_shares_network', true)

      const connectedUserIds = [
        ...(asRequester || []).map(c => c.connected_user_id),
        ...(asAccepter || []).map(c => c.user_id)
      ]

      if (connectedUserIds.length > 0) {
        // Get contacts from connected users
        const { data: extendedContacts } = await supabase
          .from('user_contacts')
          .select('*, users!user_contacts_user_id_fkey(full_name, email)')
          .in('user_id', connectedUserIds)

        if (extendedContacts) {
          // Mark as extended network contacts
          const markedExtended = extendedContacts.map(contact => ({
            ...contact,
            owner_user_id: contact.user_id,
            owner_name: (contact.users as any)?.full_name,
            owner_email: (contact.users as any)?.email,
            is_extended: true
          }))
          allContacts = [...allContacts, ...markedExtended]
        }
      }
    }

    // Simple search filter (case-insensitive)
    const queryLower = sanitizedQuery.toLowerCase()
    const results = allContacts.filter(contact => {
      const name = (contact.full_name || '').toLowerCase()
      const company = (contact.company || '').toLowerCase()
      const position = (contact.position || '').toLowerCase()
      const email = (contact.email || '').toLowerCase()

      return (
        name.includes(queryLower) ||
        company.includes(queryLower) ||
        position.includes(queryLower) ||
        email.includes(queryLower)
      )
    })

    // Add match explanations
    const resultsWithExplanations = results.map(contact => {
      const queryWords = queryLower.split(' ').filter(w => w.length > 0)
      const explanations: any = {}

      queryWords.forEach(word => {
        if ((contact.company || '').toLowerCase().includes(word)) {
          explanations.company_match = true
        }
        if ((contact.position || '').toLowerCase().includes(word)) {
          explanations.position_match = true
        }
        if ((contact.full_name || '').toLowerCase().includes(word)) {
          explanations.name_match = true
        }
      })

      return {
        ...contact,
        match_explanations: explanations
      }
    })

    // Sort by relevance (prioritize name matches, then position, then company)
    resultsWithExplanations.sort((a, b) => {
      const aScore =
        (a.match_explanations.name_match ? 3 : 0) +
        (a.match_explanations.position_match ? 2 : 0) +
        (a.match_explanations.company_match ? 1 : 0)

      const bScore =
        (b.match_explanations.name_match ? 3 : 0) +
        (b.match_explanations.position_match ? 2 : 0) +
        (b.match_explanations.company_match ? 1 : 0)

      return bScore - aScore
    })

    logSecurityEvent({
      type: 'search_performed',
      userId,
      details: `Search query: "${sanitizedQuery}", Results: ${resultsWithExplanations.length}`,
      severity: 'low'
    })

    return NextResponse.json({
      success: true,
      results: resultsWithExplanations,
      count: resultsWithExplanations.length,
      query: sanitizedQuery
    })

  } catch (error: any) {
    console.error('Search error:', error)
    logSecurityEvent({
      type: 'search_error',
      details: error.message,
      severity: 'high'
    })

    return NextResponse.json(
      { success: false, message: 'An error occurred during search' },
      { status: 500 }
    )
  }
}
