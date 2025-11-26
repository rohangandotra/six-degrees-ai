/**
 * Profile Options Constants
 * Dropdown and multi-select options for user profile onboarding
 */

export const INDUSTRY_OPTIONS = [
    'Technology',
    'Finance',
    'Healthcare',
    'Education',
    'E-commerce',
    'SaaS',
    'Fintech',
    'Biotech',
    'Climate Tech',
    'Web3/Crypto',
    'Venture Capital',
    'Consulting',
    'Real Estate',
    'Media',
    'Manufacturing',
    'Retail',
    'Hospitality',
    'Non-profit',
    'Government',
    'Other'
] as const

export const COMPANY_STAGE_OPTIONS = [
    'Pre-seed',
    'Seed',
    'Series A',
    'Series B',
    'Series C+',
    'Public',
    'Enterprise',
    'Not applicable'
] as const

export const GOAL_OPTIONS = [
    'Raising funding',
    'Hiring talent',
    'Finding customers/clients',
    'Business partnerships',
    'Career opportunities',
    'Learning/mentorship',
    'Other'
] as const

export const INTEREST_OPTIONS = [
    'AI/ML',
    'Web3/Crypto',
    'SaaS',
    'Climate Tech',
    'Fintech',
    'Healthcare',
    'Education',
    'E-commerce',
    'Developer Tools',
    'APIs',
    'Infrastructure',
    'Security',
    'Data',
    'Mobile',
    'Hardware',
    'Robotics',
    'Space Tech',
    'Biotech',
    'Other'
] as const

export const CONNECTION_TYPE_OPTIONS = [
    'Investors/VCs',
    'Engineers/Developers',
    'Designers',
    'Product Managers',
    'Executives/C-Level',
    'Founders/Entrepreneurs',
    'Sales/Business Development',
    'Recruiters/HR',
    'Mentors/Advisors',
    'Other'
] as const

export type Industry = typeof INDUSTRY_OPTIONS[number]
export type CompanyStage = typeof COMPANY_STAGE_OPTIONS[number]
export type Goal = typeof GOAL_OPTIONS[number]
export type Interest = typeof INTEREST_OPTIONS[number]
export type ConnectionType = typeof CONNECTION_TYPE_OPTIONS[number]
