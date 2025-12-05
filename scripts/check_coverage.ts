const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkCoverage() {
    console.log("📊 Checking Embedding Coverage...")

    // 1. Total Count
    const { count: total, error: err1 } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })

    if (err1) console.error("Error getting total:", err1)

    // 2. Embedded Count
    const { count: embedded, error: err2 } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .not('embedding', 'is', null)

    if (err2) console.error("Error getting embedded:", err2)

    console.log(`Total Contacts: ${total}`)
    console.log(`Embedded Contacts: ${embedded}`)
    console.log(`Coverage: ${((embedded / total) * 100).toFixed(1)}%`)

    if (embedded < total) {
        console.warn(`⚠️ MISSING EMBEDDINGS: ${total - embedded} contacts are not indexed!`)
    }

    // 3. Inspect "Annie Lindseth" (False Positive)
    const { data: annie } = await supabase
        .from('contacts')
        .select('id, full_name, position, company, embedding, user_id')
        .ilike('full_name', '%Annie Lindseth%')
        .limit(1)

    if (annie && annie.length > 0) {
        const c = annie[0]
        console.log(`\n🕵️‍♀️ Inspecting "Annie Lindseth":`)
        console.log(`   ID: ${c.id}`)
        console.log(`   User ID: ${c.user_id}`)
        console.log(`   Position: ${c.position}`)
        console.log(`   Has Embedding?: ${c.embedding ? '✅ YES' : '❌ NO'}`)
    } else {
        console.log(`\n🕵️‍♀️ "Annie Lindseth" not found in DB.`)
    }
}

checkCoverage().catch(console.error)
