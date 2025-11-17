/**
 * Security utilities for API routes
 * Includes rate limiting, input validation, and sanitization
 */

// Simple in-memory rate limiter (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

/**
 * Rate limit check
 * @param identifier - Unique identifier (user ID, IP, etc.)
 * @param config - Rate limit configuration
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  // Clean up expired entries (simple garbage collection)
  if (record && record.resetTime < now) {
    rateLimitStore.delete(identifier)
  }

  const current = rateLimitStore.get(identifier)

  if (!current) {
    // First request
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    }
  }

  if (current.count >= config.maxRequests) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    }
  }

  // Increment count
  current.count++
  rateLimitStore.set(identifier, current)

  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetTime: current.resetTime
  }
}

/**
 * Predefined rate limit configs
 */
export const RATE_LIMITS = {
  auth: { maxRequests: 5, windowMs: 5 * 60 * 1000 }, // 5 requests per 5 minutes
  search: { maxRequests: 20, windowMs: 1 * 60 * 1000 }, // 20 per minute
  upload: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  connections: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  emailGen: { maxRequests: 10, windowMs: 5 * 60 * 1000 } // 10 per 5 minutes
}

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  return true
}

/**
 * Sanitize search query to prevent injection attacks
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return ''

  // Remove SQL injection attempts
  const dangerous = ['--', ';', '/*', '*/', 'xp_', 'sp_', 'exec', 'execute', 'script', 'javascript', 'alert']
  let sanitized = query

  dangerous.forEach(term => {
    const regex = new RegExp(term, 'gi')
    sanitized = sanitized.replace(regex, '')
  })

  // Limit length
  return sanitized.slice(0, 500).trim()
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Sanitize CSV data to prevent malicious formulas (CSV injection)
 */
export function sanitizeCSVCell(cell: string): string {
  if (!cell) return ''

  // Remove leading characters that could trigger CSV formula execution
  const dangerous = ['=', '+', '-', '@', '\t', '\r']
  let sanitized = cell

  while (dangerous.some(char => sanitized.startsWith(char))) {
    sanitized = sanitized.substring(1)
  }

  return sanitizeHtml(sanitized)
}

/**
 * Log security event (in production, send to monitoring service)
 */
export function logSecurityEvent(event: {
  type: string
  userId?: string
  details: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}) {
  const timestamp = new Date().toISOString()
  console.warn(`[SECURITY ${event.severity.toUpperCase()}] ${timestamp}`, {
    type: event.type,
    userId: event.userId || 'anonymous',
    details: event.details
  })

  // TODO: In production, send to monitoring service (Sentry, DataDog, etc.)
}
