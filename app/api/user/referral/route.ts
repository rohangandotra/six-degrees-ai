import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        if (!supabase) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
        }

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id

        // Get user's referral code
        const { data: user, error } = await supabase
            .from('users')
            .select('referral_code, email')
            .eq('id', userId)
            .single()

        if (error) {
            console.error('Error fetching referral code:', error)
            return NextResponse.json({ error: 'Failed to fetch referral code' }, { status: 500 })
        }

        // Get referral stats (how many people they referred)
        const { count: referralCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('referred_by', userId)

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const referralLink = `${appUrl}/auth/sign-up?ref=${user.referral_code}`

        return NextResponse.json({
            referralCode: user.referral_code,
            referralLink,
            referralCount: referralCount || 0
        })

    } catch (error: any) {
        console.error('Referral API error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
