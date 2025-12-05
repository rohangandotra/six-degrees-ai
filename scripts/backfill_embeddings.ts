const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const dotenv = require('dotenv')

// Load environment variables
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

async function generateEmbedding(text: string) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.replace(/\n/g, ' '),
    })
    return response.data[0].embedding
}

async function backfill() {
    console.log('Starting embedding backfill...')

    // Fetch contacts without embeddings
    // Note: 'is' null check for vector column might need explicit syntax or just fetch all and filter
    // For safety, we'll fetch a batch of 100 at a time that don't have embeddings
    // Since we can't easily check 'is null' on vector in JS client sometimes, we might need a raw query or just iterate.
    // Let's try standard select first.

    let hasMore = true
    let processedCount = 0

    while (hasMore) {
        // Fetch batch of contacts where embedding is null
        // We use a raw filter because the JS client typing for vector might be tricky
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('id, full_name, company, position, email')
            .is('embedding', null)
            .limit(50)

        if (error) {
            console.error('Error fetching contacts:', error)
            break
        }

        if (!contacts || contacts.length === 0) {
            console.log('No more contacts to process.')
            hasMore = false
            break
        }

        console.log(`Processing batch of ${contacts.length} contacts...`)

        for (const contact of contacts) {
            try {
                // Create a rich text representation for embedding
                const textToEmbed = `
          Name: ${contact.full_name}
          Role: ${contact.position || 'Unknown'}
          Company: ${contact.company || 'Unknown'}
          Email: ${contact.email || ''}
        `.trim()

                const embedding = await generateEmbedding(textToEmbed)

                // Update contact
                const { error: updateError } = await supabase
                    .from('contacts')
                    .update({ embedding })
                    .eq('id', contact.id)

                if (updateError) {
                    console.error(`Failed to update contact ${contact.id}:`, updateError)
                } else {
                    processedCount++
                    process.stdout.write('.')
                }
            } catch (err) {
                console.error(`Error processing contact ${contact.id}:`, err)
            }
        }
        console.log(`\nBatch complete. Total processed: ${processedCount}`)

        // Brief pause to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log('Backfill complete!')
}

backfill().catch(console.error)
