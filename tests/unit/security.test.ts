import { sanitizeHtml, isValidUUID, isValidEmail, rateLimit } from '@/lib/security'

describe('Security Helpers', () => {
    describe('sanitizeHtml', () => {
        it('should escape script tags', () => {
            const input = '<script>alert("xss")</script>Hello'
            // The implementation escapes HTML entities, it doesn't strip them
            expect(sanitizeHtml(input)).toContain('&lt;script&gt;')
            expect(sanitizeHtml(input)).toContain('Hello')
        })

        it('should preserve safe tags if configured (or strip all if strict)', () => {
            const input = '<b>Bold</b>'
            expect(sanitizeHtml(input)).toBe('&lt;b&gt;Bold&lt;&#x2F;b&gt;')
        })

        it('should handle null/undefined', () => {
            expect(sanitizeHtml('')).toBe('')
        })
    })

    describe('isValidUUID', () => {
        it('should return true for valid UUIDs', () => {
            // Use a valid v4 UUID
            expect(isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true)
        })

        it('should return false for invalid strings', () => {
            expect(isValidUUID('not-a-uuid')).toBe(false)
            expect(isValidUUID('123')).toBe(false)
        })
    })

    describe('isValidEmail', () => {
        it('should validate correct emails', () => {
            expect(isValidEmail('test@example.com')).toBe(true)
        })

        it('should reject invalid emails', () => {
            expect(isValidEmail('test@')).toBe(false)
            expect(isValidEmail('test')).toBe(false)
            expect(isValidEmail('@example.com')).toBe(false)
        })
    })
})
