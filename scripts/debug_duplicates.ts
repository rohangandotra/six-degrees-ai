// @ts-nocheck
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDuplicates() {
    console.log("🕵️‍♀️ Inspecting Duplicates...")

    const names = ["Valencia Alvarez", "Jessica Dine", "Srivatss Khanna"]

    for (const name of names) {
        const { data: contacts } = await supabase
            .from('contacts')
            .select('id, user_id, full_name, company, position, linkedin_url')
            .ilike('full_name', `%${name}%`)

        console.log(`\nResults for "${name}": ${contacts?.length || 0} found`)
        if (contacts) {
            contacts.forEach(c => {
                console.log(`   - ID: ${c.id}`)
                console.log(`     User: ${c.user_id}`)
                console.log(`     Company: ${c.company}`)
                console.log(`     LinkedIn: ${c.linkedin_url || '(Missing)'}`)
                console.log('---')
            })
        }
    }
}

checkDuplicates().catch(console.error)
