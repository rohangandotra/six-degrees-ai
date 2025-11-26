/**
 * Check if RESEND_API_KEY is available in production
 * This script will be run in Vercel to verify env vars
 */

export async function GET(request: Request) {
    const hasResendKey = !!process.env.RESEND_API_KEY
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

    return Response.json({
        environment: process.env.NODE_ENV,
        hasResendKey,
        hasSupabaseUrl,
        hasSupabaseKey,
        resendKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 7),
    })
}
