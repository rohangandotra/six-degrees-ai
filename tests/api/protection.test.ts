/**
 * @jest-environment node
 */
import { createMocks } from 'node-mocks-http'
import { GET as getContacts } from '@/app/api/contacts/route'
import { GET as getProfile } from '@/app/api/profile/route'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn().mockResolvedValue({
        auth: {
            getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
            getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
    }),
}))

// Mock Admin client for profile route (it uses createAdminClient but checks auth first usually, or we need to check how it handles auth)
// Actually profile route uses createAdminClient but usually expects a userId param.
// Let's check the implementation of profile route. It takes userId from query param.
// If it's a public profile, it might not need auth.
// Let's test contacts route which definitely needs auth.

describe('API Route Protection', () => {
    describe('/api/contacts', () => {
        it('should return 401 if not authenticated', async () => {
            const { req } = createMocks({
                method: 'GET',
                url: 'http://localhost:3000/api/contacts',
            })

            const response = await getContacts(req as any)

            // Depending on implementation, it might return 401 or redirect
            // The current implementation returns 401 json or redirect
            // Let's check the status
            if (response.status === 500) {
                const body = await response.json()
                console.error('API Error:', body)
            }
            expect(response.status).toBe(401)
        })
    })
})
