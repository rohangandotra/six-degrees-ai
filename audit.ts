import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: '.env.local' })

async function audit() {
    console.log("🔍 Starting System Audit...\n")

    // 1. Check Environment Variables
    console.log("1️⃣  Checking Environment Variables...")
    const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY']
    const missing = requiredVars.filter(v => !process.env[v])
    if (missing.length > 0) {
        console.error("❌ Missing variables:", missing)
        return
    }
    console.log("✅ All variables present.\n")

    // 2. Check Supabase Connection & Data
    console.log("2️⃣  Checking Supabase Connection & Data...")
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // Check if 'contacts' table exists and has data
        const { count, error: countError } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })

        if (countError) {
            console.error("❌ Database Error:", countError.message)
        } else {
            console.log(`✅ Database connected. Total contacts: ${count}`)
        }

        // Fetch a sample contact to check structure
        const { data: sample, error: sampleError } = await supabase
            .from('contacts')
            .select('*')
            .limit(1)

        if (sampleError) {
            console.error("❌ Fetch Error:", sampleError.message)
        } else if (sample && sample.length > 0) {
            console.log("✅ Sample Contact:", {
                id: sample[0].id,
                full_name: sample[0].full_name,
                company: sample[0].company,
                position: sample[0].position
            })
        } else {
            console.warn("⚠️ No contacts found in table!")
        }

    } catch (err) {
        console.error("❌ Supabase Exception:", err)
    }
    console.log("\n")

    // 3. Check OpenAI Connection
    console.log("3️⃣  Checking OpenAI Connection...")
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 5
        })
        console.log("✅ OpenAI Responded:", completion.choices[0].message.content)
    } catch (err: any) {
        console.error("❌ OpenAI Error:", err.message)
    }
    console.log("\n")

    // 4. Simulate Search Logic (Local Test)
    console.log("4️⃣  Simulating Search Logic...")
    const query = "who works in tech"
    console.log(`Query: "${query}"`)

    // Fetch all contacts for a user (we need a user ID)
    // Let's find a user ID from the contacts table
    const { data: contacts } = await supabase.from('contacts').select('*').limit(50)

    if (!contacts || contacts.length === 0) {
        console.log("❌ No contacts to test search with.")
        return
    }

    const uniqueCompanies = Array.from(new Set(contacts.map((c: any) => c.company).filter(Boolean)));
    const uniquePositions = Array.from(new Set(contacts.map((c: any) => c.position).filter(Boolean)));

    console.log(`Testing with ${contacts.length} contacts.`)
    console.log(`Unique Companies: ${uniqueCompanies.length}`)
    console.log(`Unique Positions: ${uniquePositions.length}`)

    // Test AI Filter
    console.log("   👉 Testing AI Filter...")
    try {
        const companiesList = JSON.stringify(uniqueCompanies.slice(0, 20)); // Limit for test
        const positionsList = JSON.stringify(uniquePositions.slice(0, 20));

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `Select items matching query: "${query}". 
                    Companies: ${companiesList}
                    Positions: ${positionsList}
                    Return JSON {selected_companies: [], selected_positions: []}`
                }
            ],
            response_format: { type: "json_object" }
        })
        console.log("   ✅ AI Filter Result:", completion.choices[0].message.content)
    } catch (err: any) {
        console.error("   ❌ AI Filter Failed:", err.message)
    }

    // Test Fallback Logic
    console.log("   👉 Testing Fallback Logic...")
    const queryLower = query.toLowerCase();
    const queryKeywords = queryLower.split(/\s+/).filter((w: string) => w.length > 2 && !['who', 'works', 'in', 'the', 'and', 'for', 'with'].includes(w));
    console.log("   Keywords:", queryKeywords)

    const matches = contacts.filter((c: any) => {
        const text = `${c.full_name} ${c.company} ${c.position}`.toLowerCase();
        return queryKeywords.some(kw => text.includes(kw));
    })
    console.log(`   ✅ Fallback Matches: ${matches.length}`)
    if (matches.length > 0) {
        console.log("   Sample Match:", matches[0].full_name, matches[0].company)
    }

    console.log("\n🏁 Audit Complete.")
}

audit()
