"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Search, FileText, AlertCircle, Users, Loader2, Info } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

// Proper CSV parser that handles quoted values
function parseCSV(text: string): string[][] {
  const lines: string[][] = []
  let currentLine: string[] = []
  let currentValue = ""
  let insideQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentValue += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      currentLine.push(currentValue.trim())
      currentValue = ""
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      // End of line
      if (currentValue || currentLine.length > 0) {
        currentLine.push(currentValue.trim())
        if (currentLine.some(v => v)) { // Only add non-empty lines
          lines.push(currentLine)
        }
        currentLine = []
        currentValue = ""
      }
      // Skip \r\n combinations
      if (char === '\r' && nextChar === '\n') {
        i++
      }
    } else {
      currentValue += char
    }
  }

  // Handle last field and line
  if (currentValue || currentLine.length > 0) {
    currentLine.push(currentValue.trim())
    if (currentLine.some(v => v)) {
      lines.push(currentLine)
    }
  }

  return lines
}

// Match header names flexibly
function matchHeader(header: string): string | null {
  const normalized = header.toLowerCase().replace(/[^a-z]/g, '')

  if (normalized.includes('name') || normalized.includes('fullname')) return 'full_name'
  if (normalized.includes('email') || normalized.includes('mail')) return 'email'
  if (normalized.includes('company') || normalized.includes('organization')) return 'company'
  if (normalized.includes('title') || normalized.includes('position') || normalized.includes('role') || normalized.includes('job')) return 'position'
  if (normalized.includes('phone') || normalized.includes('mobile') || normalized.includes('cell')) return 'phone'

  return null
}

export default function DashboardPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(true) // Will be set based on contacts
  const [stats, setStats] = useState({
    totalContacts: 0,
    directConnections: 0,
    loading: true,
  })
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()

      if (!supabase) {
        setStats(prev => ({ ...prev, loading: false }))
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth/login")
          return
        }

        // Fetch stats from new API endpoint with cache busting
        const response = await fetch(`/api/stats?t=${Date.now()}`)
        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }

        const data = await response.json()

        setStats({
          totalContacts: data.totalAccessibleContacts || 0,
          directConnections: data.directConnections || 0,
          loading: false,
        })

        // Auto-collapse import section if contacts already exist
        setIsImportOpen((data.ownContacts || 0) === 0)
      } catch (err) {
        console.error("Error fetching stats:", err)
        setStats(prev => ({ ...prev, loading: false }))
      }
    }

    fetchStats()
  }, [router])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate CSV file
    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadedFile(file.name)

    try {
      const supabase = createClient()
      if (!supabase) throw new Error("Unable to connect to database")

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // 1. Parse CSV Client-Side
      const { default: Papa } = await import('papaparse')

      Papa.parse(file, {
        header: false, // We'll detect headers manually to be safe
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const allRows = results.data as string[][]
            if (allRows.length < 2) throw new Error("CSV file is empty")

            // Header Detection
            let headerRowIndex = 0
            const linkedinIndicators = ['first name', 'last name', 'company', 'position', 'email']

            for (let i = 0; i < Math.min(20, allRows.length); i++) {
              const rowString = allRows[i].join(' ').toLowerCase()
              const matches = linkedinIndicators.filter(ind => rowString.includes(ind)).length
              if (matches >= 2) {
                headerRowIndex = i
                break
              }
            }

            const headers = allRows[headerRowIndex].map(h => h.trim().toLowerCase())
            const dataRows = allRows.slice(headerRowIndex + 1)

            // Column Mapping
            const columnMapping: Record<string, string> = {
              'first name': 'first_name',
              'last name': 'last_name',
              'company': 'company',
              'position': 'position',
              'title': 'position',
              'email address': 'email',
              'email': 'email',
              'connected on': 'connected_on',
              'url': 'linkedin_url',
              'profile url': 'linkedin_url'
            }

            // Transform to Objects
            const contacts = dataRows.map(row => {
              const contact: any = { user_id: user.id }
              headers.forEach((header, index) => {
                const mappedKey = columnMapping[header] || header
                if (['first_name', 'last_name', 'company', 'position', 'email', 'connected_on', 'linkedin_url'].includes(mappedKey)) {
                  contact[mappedKey] = row[index]?.trim() || null
                }
              })

              // Construct full_name
              if (contact.first_name && contact.last_name) {
                contact.full_name = `${contact.first_name} ${contact.last_name}`.trim()
              } else if (contact.first_name) {
                contact.full_name = contact.first_name
              }

              return contact
            }).filter(c => c.full_name)

            if (contacts.length === 0) throw new Error("No valid contacts found")

            // 2. Batch Upload
            const BATCH_SIZE = 100
            let processed = 0

            for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
              const batch = contacts.slice(i, i + BATCH_SIZE)

              const response = await fetch('/api/contacts/upload', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-User-ID': user.id,
                },
                body: JSON.stringify({ contacts: batch }),
              })

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(`Batch ${i / BATCH_SIZE + 1} failed: ${errorData.message || response.statusText}`)
              }

              processed += batch.length
            }

            toast({
              title: "Upload successful!",
              description: `Imported ${processed} contacts successfully.`,
            })

            // Refresh stats
            const { count } = await supabase.from("contacts").select("*", { count: "exact", head: true }).eq("user_id", user.id)
            setStats(prev => ({ ...prev, totalContacts: count || 0 }))

            setTimeout(() => router.reload(), 1000)

          } catch (err: any) {
            console.error("Processing error:", err)
            toast({
              title: "Import failed",
              description: err.message,
              variant: "destructive",
            })
          } finally {
            setIsUploading(false)
          }
        },
        error: (err) => {
          console.error("CSV Parse Error:", err)
          toast({
            title: "CSV Parse Error",
            description: err.message,
            variant: "destructive",
          })
          setIsUploading(false)
        }
      })

    } catch (err: any) {
      console.error("Upload setup error:", err)
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      })
      setIsUploading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">Welcome to your network management hub</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Accessible Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <>
                <div className="text-2xl md:text-3xl font-bold">{stats.totalContacts}</div>
                <p className="text-xs text-muted-foreground mt-1">Your network + shared contacts</p>
              </>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                    <Info className="w-3 h-3" />
                    <span className="hidden sm:inline">Your network + shared contacts</span>
                    <span className="sm:hidden">Network + shared</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>This includes your direct contacts plus contacts shared by your connections</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Direct Connections</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <>
                <div className="text-2xl md:text-3xl font-bold">{stats.directConnections}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  People you're connected with
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">2nd Degree</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Extended Network</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Collapsible open={isImportOpen} onOpenChange={setIsImportOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    Import Contacts
                    <ChevronDown className={`w-4 h-4 transition-transform ${isImportOpen ? '' : '-rotate-90'}`} />
                  </CardTitle>
                  <CardDescription>Upload a CSV file to import your contacts</CardDescription>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                        <Info className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-sm p-4">
                      <div className="space-y-2">
                        <p className="font-semibold text-sm">How to export your LinkedIn connections:</p>
                        <ol className="text-xs space-y-1 list-decimal list-inside">
                          <li>Go to <a href="https://www.linkedin.com/mypreferences/d/download-my-data" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">LinkedIn Settings</a></li>
                          <li>Click "Get a copy of your data"</li>
                          <li>Select "Connections" only</li>
                          <li>Click "Request archive"</li>
                          <li>Wait for email (usually 10 minutes)</li>
                          <li>Download the ZIP file</li>
                          <li>Extract and upload the Connections.csv file here</li>
                        </ol>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <label htmlFor="csv-upload" className="cursor-pointer space-y-2">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6 text-primary" />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {isUploading ? "Uploading..." : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-sm text-muted-foreground">CSV files up to 10MB</p>
                  </div>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadedFile && (
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-200">File processed</p>
                    <p className="text-sm text-green-700 dark:text-green-300">{uploadedFile}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-200">
                  <p className="font-medium mb-1">✨ Intelligent CSV Processing</p>
                  <p>
                    Upload your LinkedIn connections export or any contact CSV.
                    We'll automatically detect headers, infer company names from email domains, and handle various formats.
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Recent Activity */}
      <Card data-version="fixed">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to different sections of your network</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 bg-transparent"
            onClick={() => router.push("/dashboard/search")}
          >
            <Search className="w-5 h-5" />
            <span>Search Network with AI</span>
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 bg-transparent"
            onClick={() => router.push("/dashboard/contacts")}
          >
            <Users className="w-5 h-5" />
            <span>View All Contacts</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
