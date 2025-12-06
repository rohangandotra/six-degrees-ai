import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security'

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

// Purpose-based keyword boost map (Fallback/Boost)
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

// Company Prestige Map
const PRESTIGE_COMPANIES = [
  'google', 'alphabet', 'meta', 'facebook', 'apple', 'amazon', 'microsoft', 'netflix', 'nvidia', 'tesla', 'openai', 'anthropic', 'stripe', 'airbnb', 'uber', 'lyft', 'salesforce', 'adobe', 'oracle', 'palantir', 'databricks', 'snowflake',
  'goldman sachs', 'morgan stanley', 'jpmorgan', 'chase', 'blackrock', 'blackstone', 'citadel', 'two sigma', 'bridgewater',
  'mckinsey', 'bcg', 'bain', 'deloitte', 'pwc', 'ey', 'kpmg',
  'sequoia', 'a16z', 'andreessen', 'benchmark', 'accel', 'greylock', 'kleiner', 'lightspeed', 'founders fund', 'y combinator', 'techstars'
];

async function generateEmbedding(text: string) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.replace(/\n/g, ' '),
    })
    return response.data[0].embedding
  } catch (error) {
    console.error('Embedding generation failed:', error)
    return null
  }
}

async function expandQueryWithAI(query: string, purpose: string) {
  try {
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
      purposeContext = `\nUser's Purpose: The user wants to ${purposeLabels[purpose] || purpose}.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini", // Restored as requested
      messages: [
        {
          role: "system",
          content: `You are an expert semantic search assistant for a professional network tool.
          
          Your Goal: Expand the user's search query into a list of relevant job titles, industries, and keywords to find the right people.
          
          Input:
          - User Query: "${query}"${purposeContext}
          
          Instructions:
          1. **Analyze Intent**: Understand what the user is looking for (e.g., "public policy" -> Government, Regulatory, Think Tanks).
          2. **Generate Target Roles**: List 10-15 specific job titles that match this intent (e.g., "Policy Advisor", "Director of Government Affairs").
          3. **Generate Target Industries/Companies**: List 10-15 relevant industries or specific company types/names (e.g., "Government Administration", "Non-profit", "Lobbying").
          4. **Generate Keywords**: List 10-15 broader keywords or skills (e.g., "legislation", "regulations", "advocacy").
          
          Return JSON:
          {
            "target_roles": ["Role 1", "Role 2"],
            "target_industries": ["Industry 1", "Industry 2"],
            "keywords": ["keyword 1", "keyword 2"]
          }
          `
        },
        { role: "user", content: "Expand this query." }
      ],
      response_format: { type: "json_object" },
    }, { timeout: 10000 });

    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error: any) {
    console.error("OpenAI expansion error:", error);
    return { target_roles: [], target_industries: [], keywords: [], error: error.message };
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

    // Rate Limit Check
    const rateLimit = checkRateLimit(userId, RATE_LIMITS.search)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimit.resetTime },
        { status: 429 }
      )
    }

    const adminSupabase = await createAdminClient()

    // --- HYBRID SEARCH IMPLEMENTATION ---

    // 0. Gather Search Scope (User IDs)
    const searchUserIds = [userId]; // Always include self
    const ownerNameMap = new Map<string, string>();
    ownerNameMap.set(userId, 'You');

    if (scope === 'extended') {
      const { data: asRequester } = await adminSupabase
        .from('user_connections')
        .select(`connected_user_id, accepter_shares_network, connected_user:users!user_connections_connected_user_id_fkey(full_name)`)
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .eq('accepter_shares_network', true)

      const { data: asAccepter } = await adminSupabase
        .from('user_connections')
        .select(`user_id, requester_shares_network, requester:users!user_connections_user_id_fkey(full_name)`)
        .eq('connected_user_id', userId)
        .eq('status', 'accepted')
        .eq('requester_shares_network', true)

      if (asRequester) {
        asRequester.forEach((c: any) => {
          if (c.connected_user_id) {
            searchUserIds.push(c.connected_user_id);
            if (c.connected_user?.full_name) {
              ownerNameMap.set(c.connected_user_id, c.connected_user.full_name);
            }
          }
        });
      }

      if (asAccepter) {
        asAccepter.forEach((c: any) => {
          if (c.user_id) {
            searchUserIds.push(c.user_id);
            if (c.requester?.full_name) {
              ownerNameMap.set(c.user_id, c.requester.full_name);
            }
          }
        });
      }
    }

    // Sanitize user IDs
    const cleanUserIds = searchUserIds.filter(id => id && id.length > 10);
    console.log(`🔎 Vector Search: Querying for user ${userId} with scope of ${cleanUserIds.length} users.`)

    // A. Vector Search (Semantic Retrieval)
    let vectorResults: any[] = []
    if (query.length > 2) {
      const queryEmbedding = await generateEmbedding(query)

      if (queryEmbedding) {
        // Call RPC with ARRAY of user IDs
        const { data: semanticMatches, error: vectorError } = await adminSupabase.rpc('match_contacts', {
          query_embedding: queryEmbedding,
          match_threshold: 0.1,
          match_count: 100,
          filter_user_ids: cleanUserIds
        })

        if (!vectorError && semanticMatches) {
          vectorResults = semanticMatches.map((c: any) => ({
            ...c,
            source: c.user_id === userId ? 'own' : 'shared',
            owner_name: ownerNameMap.get(c.user_id) || 'Extended Network',
            owner_id: c.user_id,
            match_reason: `Semantic match (${Math.round(c.similarity * 100)}%)`,
            score: c.similarity * 500
          }))
        } else if (vectorError) {
          // If error is "function not found" (signature mismatch), log it clearly
          console.error("Vector search error (RPC):", vectorError)
        }
      }
    }

    // B. Keyword Search (Lexical Retrieval - Fallback & Exact Match)
    // We still fetch own contacts for keyword matching to catch exact names that vector might miss (rare but possible)
    // and to support "Shared" contacts which aren't in the vector index RPC yet (RPC filters by user_id)

    // Fetch Own Contacts (Limit 1000 for keyword scan)
    const { data: ownContacts } = await adminSupabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .limit(1000)

    const taggedOwnContacts = (ownContacts || []).map((c: any) => ({
      ...c,
      source: 'own' as const,
      owner_name: 'You',
      owner_id: userId
    }))

    // Fetch Shared Contacts (if scope is extended)
    let sharedContacts: any[] = []
    if (scope === 'extended') {
      const { data: asRequester } = await adminSupabase
        .from('user_connections')
        .select(`connected_user_id, accepter_shares_network, connected_user:users!user_connections_connected_user_id_fkey(full_name)`)
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .eq('accepter_shares_network', true)

      const { data: asAccepter } = await adminSupabase
        .from('user_connections')
        .select(`user_id, requester_shares_network, requester:users!user_connections_user_id_fkey(full_name)`)
        .eq('connected_user_id', userId)
        .eq('status', 'accepted')
        .eq('requester_shares_network', true)

      const sharingUserIds: { id: string; name: string }[] = [
        ...(asRequester || []).map((c: any) => ({ id: c.connected_user_id, name: c.connected_user.full_name })),
        ...(asAccepter || []).map((c: any) => ({ id: c.user_id, name: c.requester.full_name }))
      ]

      for (const sharingUser of sharingUserIds) {
        const { data: userContacts } = await adminSupabase
          .from('contacts')
          .select('*')
          .eq('user_id', sharingUser.id)
          .limit(1000)

        if (userContacts) {
          sharedContacts.push(...userContacts.map((c: any) => ({
            ...c,
            source: 'shared' as const,
            owner_name: sharingUser.name,
            owner_id: sharingUser.id
          })))
        }
      }
    }

    const allKeywordCandidates = [...taggedOwnContacts, ...sharedContacts]

    // Perform Keyword Scoring
    const queryLower = query.toLowerCase();
    const queryKeywords = queryLower.split(/\s+/).filter((w: string) => w.length > 2 && !['who', 'works', 'in', 'the', 'and', 'for', 'with', 'find', 'people', 'show', 'me'].includes(w));

    const keywordResults = allKeywordCandidates.map((contact: any) => {
      let score = 0;
      const company = (contact.company || '').toLowerCase();
      const position = (contact.position || '').toLowerCase();
      const searchableText = `${contact.full_name} ${company} ${position} ${contact.email || ''} ${contact.location || ''}`.toLowerCase();
      let match_reason = "";

      if (searchableText.includes(queryLower)) {
        score += 50; // Strong exact match
        match_reason = "Exact query match";
      } else {
        const matchedKw = queryKeywords.find((kw: string) => searchableText.includes(kw));
        if (matchedKw) {
          score += 20;
          match_reason = `Matches term: "${matchedKw}"`;
        }
      }

      // Purpose Boost
      if (purpose && purpose !== "any" && PURPOSE_BOOST_MAP[purpose]) {
        const boostMap = PURPOSE_BOOST_MAP[purpose];
        if (boostMap.positionKeywords.some(kw => position.includes(kw)) || boostMap.companyKeywords.some(kw => company.includes(kw))) {
          score += boostMap.scoreBoost;
        }
      }

      // Seniority & Prestige
      for (const [role, boost] of Object.entries(SENIORITY_MAP)) {
        if (position.includes(role)) {
          score += boost;
          break;
        }
      }
      if (PRESTIGE_COMPANIES.some(pc => company.includes(pc))) score += 5;

      return { ...contact, score, match_reason: match_reason || "Keyword match" };
    }).filter((c: any) => c.score > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 50);


    // C. Hybrid Merge (Deduplicate & Combine)
    const mergedMap = new Map<string, any>();

    // Add Vector Results
    vectorResults.forEach((c: any) => {
      mergedMap.set(c.id, c);
    });

    // Add Keyword Results (Boost score if already exists)
    keywordResults.forEach((c: any) => {
      if (mergedMap.has(c.id)) {
        const existing = mergedMap.get(c.id);
        existing.score += c.score; // Boost score
        existing.match_reason += ` + ${c.match_reason}`;

        // Enrich metadata if missing in existing record (e.g. from vector search)
        if (!existing.linkedin_url && c.linkedin_url) existing.linkedin_url = c.linkedin_url;
        if (!existing.company && c.company) existing.company = c.company;
        if (!existing.position && c.position) existing.position = c.position;
        if (!existing.location && c.location) existing.location = c.location;
        if (!existing.email && c.email) existing.email = c.email;
      } else {
        mergedMap.set(c.id, c);
      }
    });

    // --- Deduplication Logic ---
    const candidates = Array.from(mergedMap.values())

    // 1. Group by Normalized Name
    const groups = new Map<string, any[]>();
    candidates.forEach(c => {
      const key = (c.full_name || '').toLowerCase().trim();
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });

    const uniqueCandidates: any[] = [];

    groups.forEach((group) => {
      if (group.length === 1) {
        uniqueCandidates.push(group[0]);
        return;
      }

      // Logic to pick the BEST candidate from duplicates
      // Priority:
      // 1. Has LinkedIn URL
      // 2. Is Direct Connection (source === 'own')
      // 3. Has Company/Position info
      // 4. Highest Score

      const best = group.reduce((prev, current) => {
        const prevHasLinkedIn = !!prev.linkedin_url;
        const currHasLinkedIn = !!current.linkedin_url;

        if (prevHasLinkedIn && !currHasLinkedIn) return prev;
        if (!prevHasLinkedIn && currHasLinkedIn) return current;

        // If both have/don't have LinkedIn, prefer OWN source
        const prevIsOwn = prev.source === 'own';
        const currIsOwn = current.source === 'own';
        if (prevIsOwn && !currIsOwn) return prev;
        if (!prevIsOwn && currIsOwn) return current;

        // If equal on Source, prefer richer metadata
        const prevScore = (prev.company ? 1 : 0) + (prev.position ? 1 : 0);
        const currScore = (current.company ? 1 : 0) + (current.position ? 1 : 0);

        if (prevScore > currScore) return prev;
        if (currScore > prevScore) return current;

        // Fallback to Search Score
        return prev.score > current.score ? prev : current;
      });

      // Merge metadata if possible? (e.g. if winner is missing email but loser has it)
      // For simplicity, just take the best record.
      uniqueCandidates.push(best);
    });

    // Sort by score again
    uniqueCandidates.sort((a, b) => b.score - a.score);

    // Slice top 50 for Reranking
    let finalPool = uniqueCandidates.slice(0, 50);; // Top 50 Hybrid Results

    // DEBUG: Check for LinkedIn URLs in the pool
    const debugLinkedIn = finalPool.filter(c => c.linkedin_url).length;
    console.log(`📊 Hybrid Pool: ${finalPool.length} candidates. ${debugLinkedIn} have LinkedIn URLs.`);


    // D. LLM Reranking (High Precision)
    let finalResults = finalPool;

    if (finalPool.length > 0 && query.length > 3) {
      try {
        const candidatesList = finalPool.map((c: any, index: number) =>
          `${index}. ${c.full_name} | ${c.position} at ${c.company}`
        ).join('\n');

        console.log(`🧠 Reranking ${finalPool.length} candidates with GPT-5-Mini...`);

        const rerankCompletion = await openai.chat.completions.create({
          model: "gpt-5-mini",
          messages: [
            {
              role: "system",
              content: `You are a precision ranking assistant.
              
              Task:
              1. Analyze the query and the candidate list.
              2. Select ONLY candidates that are strictly relevant to the query.
              3. For each selected candidate, provide a 1-sentence justification (max 15 words) explaining why they match.
              4. Return a JSON object with an array of result objects.
              
              Output Format: 
              { 
                "ranked_results": [
                  { "index": 2, "reason": "Former VP of Engineering at Google matches 'Tech Lead'." },
                  { "index": 5, "reason": "Investment Partner at Sequoia matches 'VC'." }
                ] 
              } 
              
              CRITICAL: 
              1. ONLY include candidates that are STRICTLY RELEVANT.
              2. If a candidate is not relevant, DO NOT include them.
              3. If no candidates are relevant, return an empty array in "ranked_results".`
            },
            {
              role: "user",
              content: `Query: "${query}"\n\nCandidates:\n${candidatesList}`
            }
          ],
          response_format: { type: "json_object" },
        }, { timeout: 15000 }); // Increased timeout for heavier model

        const rerankResult = JSON.parse(rerankCompletion.choices[0].message.content || '{}');
        const rankedResults = rerankResult.ranked_results || [];

        const candidateMap = new Map(finalPool.map((c: any, i: number) => [i, c]));
        const reorderedCandidates: any[] = [];

        // Only include candidates explicitly selected by the AI
        rankedResults.forEach((item: any) => {
          const index = item.index;
          if (candidateMap.has(index)) {
            const candidate = candidateMap.get(index);
            // Append AI Reason to match_reason (or replace it for clarity)
            candidate.match_reason = `AI Match: ${item.reason}`;
            reorderedCandidates.push(candidate);
          }
        });

        finalResults = reorderedCandidates;
      } catch (rerankError: any) {
        console.error("❌ Reranking failed:", rerankError.message, rerankError);
        // Fallback to pool if rerank fails, but we should log WHY
      }
    }

    return NextResponse.json({
      results: finalResults,
      debug: {
        vectorCount: vectorResults.length,
        keywordCount: keywordResults.length,
        userId: userId
      }
    })

  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error', details: error.toString() },
      { status: 500 }
    )
  }
}
