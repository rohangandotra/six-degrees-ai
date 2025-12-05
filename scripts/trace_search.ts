// @ts-nocheck
const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiApiKey = process.env.OPENAI_API_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const openai = new OpenAI({ apiKey: openaiApiKey })

async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.replace(/\n/g, ' '),
    })
    return response.data[0].embedding
}

async function traceSearch() {
    const query = "public policy"
    console.log(`\n🔍 TRACING SEARCH FOR: "${query}"\n`)

    // 1. Get User ID (simulate logged in user)
    // We'll pick the user who owns the contacts we saw in the debug script
    const { data: sampleContact } = await supabase.from('contacts').select('user_id').not('embedding', 'is', null).limit(1).single()
    const userId = sampleContact.user_id
    console.log(`👤 User ID: ${userId}`)

    // 2. Vector Search (RPC)
    console.log(`\n--- STEP 1: VECTOR SEARCH (RPC) ---`)
    const embedding = await generateEmbedding(query)
    const { data: vectorResults, error: rpcError } = await supabase.rpc('match_contacts', {
        query_embedding: embedding,
        match_threshold: 0.1,
        match_count: 100,
        filter_user_ids: [userId] // Test with array (Self only for trace)
    })

    if (rpcError) {
        console.error("❌ RPC Error:", rpcError)
    } else {
        console.log(`✅ Found ${vectorResults.length} Vector Matches`)
        if (vectorResults.length > 0) {
            console.log("Top 3 Vector Results:")
            vectorResults.slice(0, 3).forEach(c => console.log(`   [${(c.similarity * 500).toFixed(1)}] ${c.full_name} (${c.position})`))
        } else {
            console.log("⚠️ ZERO Vector Matches! This is why search falls back to keywords.")
        }
    }

    // 3. Keyword Search (Simulation)
    console.log(`\n--- STEP 2: KEYWORD SEARCH (Simulation) ---`)
    const { data: ownContacts } = await supabase.from('contacts').select('*').eq('user_id', userId).limit(1000)

    const queryLower = query.toLowerCase()
    const keywords = queryLower.split(/\s+/)

    const keywordResults = ownContacts.map(c => {
        let score = 0
        const text = `${c.full_name} ${c.company} ${c.position}`.toLowerCase()

        if (text.includes(queryLower)) score += 50
        else if (keywords.some(k => text.includes(k))) score += 20

        return { ...c, score }
    }).filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 50)

    console.log(`✅ Found ${keywordResults.length} Keyword Matches`)
    if (keywordResults.length > 0) {
        console.log("Top 3 Keyword Results:")
        keywordResults.slice(0, 3).forEach(c => console.log(`   [${c.score}] ${c.full_name} (${c.position})`))
    }

    // 4. Merge Logic
    console.log(`\n--- STEP 3: MERGE ---`)
    const mergedMap = new Map()

    // Add Vector
    vectorResults.forEach(c => {
        mergedMap.set(c.id, { ...c, score: c.similarity * 500, match_reason: "Vector" })
    })

    // Add Keyword
    keywordResults.forEach(c => {
        if (mergedMap.has(c.id)) {
            const ex = mergedMap.get(c.id)
            ex.score += c.score
            ex.match_reason += " + Keyword"
        } else {
            mergedMap.set(c.id, { ...c, match_reason: "Keyword" })
        }
    })

    const candidates = Array.from(mergedMap.values()).sort((a, b) => b.score - a.score).slice(0, 50)
    console.log(`✅ Final Candidates Pool: ${candidates.length}`)
    console.log("Top 5 Candidates (Pre-Rerank):")
    candidates.slice(0, 5).forEach(c => console.log(`   [${c.score.toFixed(1)}] ${c.full_name} - ${c.match_reason}`))

    // 5. Reranking (Simulation)
    console.log(`\n--- STEP 4: RERANKING ---`)
    if (candidates.length > 0) {
        console.log("📡 Sending top candidates to GPT-5-mini...")
        // (Skipping actual call to save time, assuming vector score determines input order)
        // The key is: Did the "Good" results make it into the top 50?

        const relevantInTop50 = candidates.filter(c =>
            c.position?.toLowerCase().includes('policy') ||
            c.company?.toLowerCase().includes('policy')
        )

        console.log(`\n📊 ANALYSIS:`)
        console.log(`Sent ${candidates.length} candidates to Reranker.`)
        console.log(`Contains 'Policy' related contacts: ${relevantInTop50.length}`)

        if (relevantInTop50.length > 0) {
            console.log("✅ Good candidates ARE in the list. If search fails, Reranker is blaming them.")
        } else {
            console.log("❌ Good candidates are MISSING from the list. Retrieval is the bottleneck.")
        }
    }
}

traceSearch().catch(console.error)
