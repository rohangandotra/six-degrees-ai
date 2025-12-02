import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

// Helper to recursively find files
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = fs.readdirSync(dirPath)

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
            }
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file))
        }
    })

    return arrayOfFiles
}

describe('Secret Scanning', () => {
    // Define patterns for common secrets
    const secretPatterns = [
        { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
        { name: 'Private Key', pattern: /-----BEGIN PRIVATE KEY-----/ },
        { name: 'Supabase Service Role', pattern: /eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/ }, // JWT pattern, broad but catches keys
        { name: 'Generic API Key', pattern: /api_key\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/i },
    ]

    // Whitelist known false positives or test files
    const whitelist = [
        'tests/security/secrets.test.ts', // This file itself
        'package-lock.json',
        '.env.local.example',
        'jest.config.ts'
    ]

    const filesToScan = getAllFiles(process.cwd())
        .filter(f => !f.includes('node_modules') && !f.includes('.git') && !f.includes('.next') && !f.endsWith('.png') && !f.endsWith('.ico') && !f.includes('/out/') && !f.includes('/android/') && !f.includes('/ios/') && !f.includes('.env'))

    it('should not contain hardcoded secrets', () => {
        const violations: string[] = []

        filesToScan.forEach(file => {
            const relativePath = path.relative(process.cwd(), file)
            if (whitelist.some(w => relativePath.includes(w))) return

            try {
                const content = fs.readFileSync(file, 'utf-8')

                secretPatterns.forEach(({ name, pattern }) => {
                    if (pattern.test(content)) {
                        // Check if it's a Supabase key but actually just a public anon key (which is safe)
                        if (name === 'Supabase Service Role' && content.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
                            return
                        }
                        // Check if it's an env var reference
                        if (content.includes('process.env')) {
                            // Simple heuristic: if the line has process.env, it's likely safe usage, not hardcoded
                            // This is a simplification; a real scanner is more robust.
                        }

                        violations.push(`${name} found in ${relativePath}`)
                    }
                })
            } catch (err) {
                // Ignore binary files read errors
            }
        })

        if (violations.length > 0) {
            console.error('Security Violations Found:', violations)
        }

        expect(violations).toEqual([])
    })
})
