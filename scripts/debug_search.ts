// @ts-nocheck
const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiApiKey = process.env.OPENAI_API_KEY

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const openai = new OpenAI({ apiKey: openaiApiKey })

async function generateEmbedding(text) {
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

async function debugSearch() {
    const query = "public policy"
    console.log(`Running debug search for: "${query}"`)

    // 1. Check if ANY contacts have embeddings
    const { count, error: countError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .not('embedding', 'is', null)

    if (countError) console.error("Count error:", countError)
    console.log(`Total contacts with embeddings: ${count}`)

    if (count === 0) {
        console.log("CRITICAL: No embeddings found! Backfill failed or empty.")
        return
    }

    // 2. Generate Query Embedding
    const embedding = await generateEmbedding(query)
    if (!embedding) {
        console.error("Failed to generate query embedding")
        return
    }

    // 3. Test RPC
    // We need a valid user_id. I'll fetch the first user found in contacts.
    const { data: sampleContact } = await supabase.from('contacts').select('user_id').limit(1).single()
    const textUserId = sampleContact?.user_id

    console.log(`Testing RPC with user_id: ${textUserId}`)

    const { data: vectorResults, error: rpcError } = await supabase.rpc('match_contacts', {
        query_embedding: embedding,
        match_threshold: 0.1, // Very low threshold to catch anything
        match_count: 5,
        filter_user_id: textUserId
    })

    if (rpcError) {
        console.error("RPC Error:", rpcError)
    } else {
        console.log("Vector Search Results (Top 5):")
        vectorResults.forEach(c => {
            console.log(`- [${c.similarity.toFixed(4)}] ${c.full_name} (${c.position} @ ${c.company})`)
        })
        if (vectorResults.length === 0) console.log("No vector matches found (even with 0.1 threshold)!")
    }
}

debugSearch().catch(console.error)
