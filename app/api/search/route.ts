import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Helper to create Admin Client
async function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Helper to use OpenAI for context-aware filtering
// Generic category map for fallback when AI fails or query is simple
const CATEGORY_MAP: Record<string, { companies?: string[]; positions?: string[]; keywords?: string[] }> = {
  tech: {
    companies: ['Wayfair', 'Stripe', 'Google', 'Meta', 'Apple', 'Amazon', 'Microsoft'],
    positions: ['Software Engineer', 'Developer', 'CTO', 'Product Manager', 'Data Scientist'],
    keywords: ['software', 'developer', 'engineer', 'technology', 'saas', 'startup', 'tech']
  },
  finance: {
    companies: ['Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Citigroup'],
    positions: ['Analyst', 'Investment Banker', 'Portfolio Manager'],
    keywords: ['finance', 'investment', 'banking', 'capital', 'equity']
  },
  investor: {
    companies: ['Sequoia Capital', 'Andreessen Horowitz', 'Accel', 'Kleiner Perkins'],
    positions: ['Partner', 'Venture Capitalist', 'Angel Investor'],
    keywords: ['investor', 'venture', 'angel', 'vc', 'funding']
  }
  // add more categories as needed
};

// Purpose-based keyword boost map
const PURPOSE_BOOST_MAP: Record<string, { positionKeywords: string[]; companyKeywords: string[]; scoreBoost: number }> = {
  raise_funds: {
    positionKeywords: ['investor', 'vc', 'venture', 'partner', 'angel', 'gp', 'fund', 'capital'],
    companyKeywords: ['sequoia', 'andreessen', 'accel', 'benchmark', 'kleiner', 'greylock', 'capital', 'ventures'],
    scoreBoost: 15
  },
  hire_talent: {
    positionKeywords: ['engineer', 'developer', 'designer', 'product manager', 'data scientist', 'analyst'],
    companyKeywords: ['google', 'meta', 'apple', 'amazon', 'microsoft', 'stripe', 'airbnb'],
    scoreBoost: 10
  },
  find_mentors: {
    positionKeywords: ['vp', 'director', 'head', 'chief', 'founder', 'ceo', 'cto', 'cpo', 'lead'],
    companyKeywords: [],
    scoreBoost: 12
  },
  explore_partnerships: {
    positionKeywords: ['bd', 'business development', 'partnerships', 'sales', 'ceo', 'founder'],
    companyKeywords: [],
    scoreBoost: 10
  },
  get_advice: {
    positionKeywords: ['founder', 'ceo', 'expert', 'specialist', 'consultant', 'advisor'],
    companyKeywords: [],
    scoreBoost: 8
  }
}
};

// Seniority Scoring Map
const SENIORITY_MAP: Record<string, number> = {
  'founder': 15,
  'co-founder': 15,
  'ceo': 15,
  'cto': 15,
  'cpo': 15,
  'cmo': 15,
  'coo': 15,
  'cfo': 15,
  'president': 15,
  'partner': 12,
  'vice president': 10,
  'vp': 10,
  'director': 10,
  'head': 8,
  'principal': 8,
  'lead': 5,
  'manager': 3,
  'senior': 3,
  'staff': 3
};

// Company Prestige Map (Simple list of top tier firms)
const PRESTIGE_COMPANIES = [
  // Tech
  'google', 'alphabet', 'meta', 'facebook', 'apple', 'amazon', 'microsoft', 'netflix', 'nvidia', 'tesla', 'openai', 'anthropic', 'stripe', 'airbnb', 'uber', 'lyft', 'salesforce', 'adobe', 'oracle', 'palantir', 'databricks', 'snowflake',
  // Finance
  'goldman sachs', 'morgan stanley', 'jpmorgan', 'chase', 'blackrock', 'blackstone', 'citadel', 'two sigma', 'bridgewater',
  // Consulting
  'mckinsey', 'bcg', 'bain', 'deloitte', 'pwc', 'ey', 'kpmg',
  // VC
  'sequoia', 'a16z', 'andreessen', 'benchmark', 'accel', 'greylock', 'kleiner', 'lightspeed', 'founders fund', 'y combinator', 'techstars'
];

async function filterWithAI(query: string, purpose: string, uniqueCompanies: string[], uniquePositions: string[]) {
  try {
    // Limit context size to avoid token limits and latency
    // Take top 200 items (assuming the list is somewhat sorted or random, it's better than nothing)
    const companiesList = JSON.stringify(uniqueCompanies.slice(0, 200));
    const positionsList = JSON.stringify(uniquePositions.slice(0, 200));

    // Build purpose context string
    let purposeContext = "";
    if (purpose && purpose !== "any") {
      const purposeLabels: Record<string, string> = {
        raise_funds: "raise funds/fundraising",
        hire_talent: "hiring/recruiting talent",
        find_mentors: "finding mentors/advisors",
        explore_partnerships: "exploring partnerships/business development",
        get_advice: "getting advice/expert guidance"
      };
      purposeContext = `\nUser's Purpose: The user wants to ${purposeLabels[purpose] || purpose}. Prioritize contacts that can help with this goal.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert contact search assistant.
          
          Your Goal: deeply understand the user's search intent and select the most relevant companies and positions from the provided lists.
          
          Input:
          - User Query: "${query}"${purposeContext}
          - Available Companies: ${companiesList}
          - Available Positions: ${positionsList}
          
          Instructions:
          1. **Analyze Intent**: Look beyond keywords. If user asks for "investors", look for "Partner", "VC", "Angel", "Sequoia". If "tech leaders", look for "CTO", "VP Engineering", "Google".
          2. **Select Companies**: Pick ALL companies that match the industry or prestige level implied.
          3. **Select Positions**: Pick ALL positions that match the role or seniority implied.
          4. **Generate Keywords**: Create a list of 5-10 high-value keywords (synonyms, related roles, industries) to catch items that might not be in the lists.
          
          Return JSON:
          {
            "selected_companies": ["Company A", "Company B"],
            "selected_positions": ["Position X", "Position Y"],
            "relevant_keywords": ["keyword1", "keyword2"]
          }
          `
        },
        { role: "user", content: "Filter the lists based on my query." }
      ],
      response_format: { type: "json_object" },
    }, { timeout: 8000 }); // Increased to 8s (Vercel limit is usually 10s, but we need to be careful)

    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error: any) {
    console.error("OpenAI filter error:", error);
    return { selected_companies: [], selected_positions: [], relevant_keywords: [], error: error.message };
  }
}

export async function POST(request: Request) {
  try {
    const { query, purpose = "any", scope = "extended" } = await request.json()

    // 1. Verify Session
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 2. Fetch User's Own Contacts
    const adminSupabase = await createAdminClient()
    const { data: ownContacts, error: dbError } = await adminSupabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .limit(10000)

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Add source tag to own contacts
    const taggedOwnContacts = (ownContacts || []).map((c: any) => ({
      ...c,
      source: 'own' as const,
      owner_name: 'You',
      owner_id: userId
    }))

    // 3. Fetch Shared Contacts (if scope is extended)
    let sharedContacts: any[] = []

    if (scope === 'extended') {
      // Get connections where user can access shared networks
      const { data: asRequester } = await adminSupabase
        .from('user_connections')
        .select(`
          connected_user_id,
          accepter_shares_network,
          connected_user:users!user_connections_connected_user_id_fkey(full_name)
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .eq('accepter_shares_network', true)

      const { data: asAccepter } = await adminSupabase
        .from('user_connections')
        .select(`
          user_id,
          requester_shares_network,
          requester:users!user_connections_user_id_fkey(full_name)
        `)
        .eq('connected_user_id', userId)
        .eq('status', 'accepted')
        .eq('requester_shares_network', true)

      // Collect user IDs who share their network
      const sharingUserIds: { id: string; name: string }[] = [
        ...(asRequester || []).map((c: any) => ({
          id: c.connected_user_id,
          name: c.connected_user.full_name
        })),
        ...(asAccepter || []).map((c: any) => ({
          id: c.user_id,
          name: c.requester.full_name
        }))
      ]

      // Fetch contacts from all sharing users
      for (const sharingUser of sharingUserIds) {
        const { data: userContacts } = await adminSupabase
          .from('contacts')
          .select('*')
          .eq('user_id', sharingUser.id)
          .limit(5000) // Limit per user to avoid overload

        if (userContacts) {
          const taggedContacts = userContacts.map((c: any) => ({
            ...c,
            source: 'shared' as const,
            owner_name: sharingUser.name,
            owner_id: sharingUser.id
          }))
          sharedContacts.push(...taggedContacts)
        }
      }
    }

    // Combine all contacts
    const allContacts = [...taggedOwnContacts, ...sharedContacts]

    if (allContacts.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // 4. Deduplication Logic
    const contactMap = new Map<string, any>();

    allContacts.forEach(contact => {
      // Create a unique key based on normalized name, company, and position
      // We use a simplified normalization to catch slight variations
      const name = (contact.full_name || '').toLowerCase().trim();
      const company = (contact.company || '').toLowerCase().trim();
      const position = (contact.position || '').toLowerCase().trim();

      // If name is missing, skip
      if (!name) return;

      const key = `${name}|${company}|${position}`;

      if (contactMap.has(key)) {
        const existing = contactMap.get(key);

        // Merge logic
        // 1. Add owner to connected_via list
        if (contact.owner_name && !existing.connected_via.includes(contact.owner_name)) {
          existing.connected_via.push(contact.owner_name);
        }

        // 2. If this is 'own' contact, mark as own (prioritize direct connection)
        if (contact.source === 'own') {
          existing.source = 'own';
          existing.owner_name = 'You';
        }

        // 3. Keep the most complete data (e.g. if existing is missing email but new has it)
        if (!existing.email && contact.email) existing.email = contact.email;
        if (!existing.linkedin_url && contact.linkedin_url) existing.linkedin_url = contact.linkedin_url;
        if (!existing.location && contact.location) existing.location = contact.location;

      } else {
        // Initialize new entry
        contactMap.set(key, {
          ...contact,
          connected_via: contact.owner_name ? [contact.owner_name] : []
        });
      }
    });

    const uniqueContacts = Array.from(contactMap.values());

    // 5. Extract Unique Metadata for AI
    const uniqueCompanies = Array.from(new Set(uniqueContacts.map((c: any) => c.company).filter(Boolean)));
    const uniquePositions = Array.from(new Set(uniqueContacts.map((c: any) => c.position).filter(Boolean)));

    // 6. AI Filtering (with fallback)
    let aiFilter: any = { selected_companies: [], selected_positions: [], relevant_keywords: [] };

    // Only use AI if query is complex enough (more than 2 chars)
    if (query.length > 2) {
      aiFilter = await filterWithAI(query, purpose, uniqueCompanies, uniquePositions);
      console.log("AI Filter Result:", aiFilter);
    }

    // Fallback: expand generic keywords using CATEGORY_MAP when AI returns empty selections
    if ((aiFilter.selected_companies?.length ?? 0) === 0 && (aiFilter.selected_positions?.length ?? 0) === 0) {
      // Ensure the arrays exist before pushing
      aiFilter.selected_companies = [];
      aiFilter.selected_positions = [];
      const lowerKeywords = query.toLowerCase().split(/\s+/);
      lowerKeywords.forEach((kw: string) => {
        const map = CATEGORY_MAP[kw];
        if (map) {
          if (map.companies) map.companies.forEach((c: string) => aiFilter.selected_companies?.push(c));
          if (map.positions) map.positions.forEach((p: string) => aiFilter.selected_positions?.push(p));
          if (map.keywords) map.keywords.forEach((k: string) => aiFilter.relevant_keywords?.push(k));
        }
      });
    }

    const selectedCompanies = new Set((aiFilter.selected_companies || []).map((c: string) => c.toLowerCase()));
    const selectedPositions = new Set((aiFilter.selected_positions || []).map((p: string) => p.toLowerCase()));
    const relevantKeywords = (aiFilter.relevant_keywords || []).map((k: string) => k.toLowerCase());

    // 7. Apply Filter & Score
    const queryLower = query.toLowerCase();
    const queryKeywords = queryLower.split(/\s+/).filter((w: string) => w.length > 2 && !['who', 'works', 'in', 'the', 'and', 'for', 'with'].includes(w));

    const results = uniqueContacts
      .map((contact: any) => {
        let score = 0;
        const company = (contact.company || '').toLowerCase();
        const position = (contact.position || '').toLowerCase();
        const searchableText = `${contact.full_name} ${company} ${position} ${contact.email || ''} ${contact.location || ''}`.toLowerCase();

        // High Score: AI Match
        if (selectedCompanies.has(company)) score += 20; // Boost AI matches significantly
        if (selectedPositions.has(position)) score += 20;

        // Medium Score: Direct Keyword Match (Fallback)
        // Check if the query appears as a phrase
        if (searchableText.includes(queryLower)) score += 10;

        // Check AI-generated synonyms (relevant_keywords)
        relevantKeywords.forEach((kw: string) => {
          if (searchableText.includes(kw)) score += 5;
        });

        // Purpose-based score boost
        let purposeBoostApplied = false;
        if (purpose && purpose !== "any" && PURPOSE_BOOST_MAP[purpose]) {
          const boostMap = PURPOSE_BOOST_MAP[purpose];

          // Check if position matches any purpose keywords
          const positionMatch = boostMap.positionKeywords.some(kw => position.includes(kw));
          if (positionMatch) {
            score += boostMap.scoreBoost;
            purposeBoostApplied = true;
          }

          // Check if company matches any purpose keywords
          const companyMatch = boostMap.companyKeywords.some(kw => company.includes(kw));
          if (companyMatch) {
            score += boostMap.scoreBoost;
            purposeBoostApplied = true;
          }
        }

        // --- NEW SCORING LOGIC ---

        // 1. Seniority Boost
        let seniorityScore = 0;
        for (const [role, boost] of Object.entries(SENIORITY_MAP)) {
          if (position.includes(role)) {
            seniorityScore = Math.max(seniorityScore, boost); // Take highest match
          }
        }
        score += seniorityScore;

        // 2. Prestige Company Boost
        const isPrestige = PRESTIGE_COMPANIES.some(pc => company.includes(pc));
        if (isPrestige) {
          score += 10;
        }

        // 3. Recency Boost (Prioritize fresh connections)
        if (contact.connected_on) {
          const connectedDate = new Date(contact.connected_on);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - connectedDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 90) score += 5; // < 3 months
          else if (diffDays < 365) score += 3; // < 1 year
        }

        // 4. Own Contact Boost (Slight preference for direct connections)
        if (contact.source === 'own') {
          score += 5;
        }

        // Determine Match Reason
        let match_reason = "Matched query keywords";
        if (purposeBoostApplied) {
          const purposeLabels: Record<string, string> = {
            raise_funds: "fundraising goals",
            hire_talent: "hiring needs",
            find_mentors: "mentorship goals",
            explore_partnerships: "partnership goals",
            get_advice: "advisory needs"
          };
          match_reason = `Relevant for ${purposeLabels[purpose] || purpose}`;
        } else if (selectedCompanies.has(company)) {
          match_reason = `Matches company: ${contact.company}`;
        } else if (selectedPositions.has(position)) {
          match_reason = `Matches position: ${contact.position}`;
        } else {
          // Check for keyword matches in reason
          const matchedKw = [...queryKeywords, ...relevantKeywords].find(kw => searchableText.includes(kw));
          if (matchedKw) {
            match_reason = `Matches keyword: "${matchedKw}"`;
          }
        }

        return { contact: { ...contact, match_reason }, score };
      })
      .filter((item: any) => item.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 50) // Top 50
      .map((item: any) => item.contact);

    return NextResponse.json({
      results,
      debug: {
        ...aiFilter,
        contactCount: uniqueContacts.length,
        userId: userId,
        queryKeywords: queryKeywords,
        sampleContact: uniqueContacts[0] ? { company: uniqueContacts[0].company, position: uniqueContacts[0].position, source: uniqueContacts[0].source } : null
      }
    })

  } catch (error: any) {
    console.error('Search error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Internal server error', details: error.toString() },
      { status: 500 }
    )
  }
}
