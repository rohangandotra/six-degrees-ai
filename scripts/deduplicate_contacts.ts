// @ts-nocheck
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function deduplicateContacts() {
    console.log("🧹 Starting Contact Deduplication...")

    // 1. Fetch all contacts
    // In production, we might filter by user_id to be safe, 
    // but here we can scan everyone or just the affected users.
    // Warning: Fetching ALL might be huge. Let's do it per user.

    const { data: users, error: userError } = await supabase.from('users').select('id')
    if (userError) {
        console.error("User fetch error:", userError)
        return
    }

    for (const user of users) {
        const userId = user.id
        console.log(`\nProcessing User: ${userId}`)

        // Fetch all contacts for this user
        let { data: contacts, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', userId)

        if (error || !contacts) {
            console.log("  No contacts or error.")
            continue
        }

        // 2. Group by Normalized Name
        const groups = new Map()

        for (const c of contacts) {
            if (!c.full_name) continue
            const key = c.full_name.trim().toLowerCase()
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key).push(c)
        }

        // 3. Process Groups
        let mergedCount = 0
        let deletedCount = 0

        for (const [name, group] of groups) {
            if (group.length < 2) continue

            // Found a duplicate group!
            // Strategy: Pick Master.
            // Priority: Has LinkedIn > Has Email > Oldest (First created)

            group.sort((a, b) => {
                const aHasLi = !!a.linkedin_url
                const bHasLi = !!b.linkedin_url
                if (aHasLi && !bHasLi) return -1 // a comes first
                if (!aHasLi && bHasLi) return 1

                const aHasEmail = !!a.email
                const bHasEmail = !!b.email
                if (aHasEmail && !bHasEmail) return -1
                if (!aHasEmail && bHasEmail) return 1

                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            })

            const master = group[0]
            const slaves = group.slice(1)

            console.log(`  🔗 Merging ${slaves.length} duplicates into ${master.full_name} (${master.id})`)

            // Update Master if Slaves have info Master lacks?
            // e.g. Master has LinkedIn but no Email, Slave has Email.
            let updates = {}
            for (const slave of slaves) {
                if (!master.email && slave.email) updates.email = slave.email
                if (!master.company && slave.company) updates.company = slave.company
                if (!master.position && slave.position) updates.position = slave.position
                if (!master.location && slave.location) updates.location = slave.location
                if (!master.phone && slave.phone) updates.phone = slave.phone
                if (!master.embedding && slave.embedding) updates.embedding = slave.embedding
            }

            if (Object.keys(updates).length > 0) {
                await supabase.from('contacts').update(updates).eq('id', master.id)
                console.log(`     Updated Master with: ${Object.keys(updates).join(', ')}`)
            }

            // Delete Slaves
            const slaveIds = slaves.map(s => s.id)
            await supabase.from('contacts').delete().in('id', slaveIds)
            deletedCount += slaveIds.length
            mergedCount++
        }

        if (deletedCount > 0) {
            console.log(`  ✅ User ${userId}: Merged ${mergedCount} groups, deleted ${deletedCount} rows.`)
        } else {
            console.log(`  User ${userId}: Clean.`)
        }
    }
}

deduplicateContacts().catch(console.error)
