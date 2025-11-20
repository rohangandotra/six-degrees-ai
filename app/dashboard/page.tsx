"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Search, FileText, AlertCircle, Users, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

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

        // Fetch total contacts
        const { count: contactsCount } = await supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)

        // Fetch direct connections
        const { count: connectionsCount } = await supabase
          .from("connections")
          .select("*", { count: "exact", head: true })
          .or(`requester_id.eq.${user.id},accepter_id.eq.${user.id}`)
          .eq("status", "accepted")

        setStats({
          totalContacts: contactsCount || 0,
          directConnections: connectionsCount || 0,
          loading: false,
        })
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

    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error("Unable to connect to database")
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Not authenticated")
      }

      // Read and parse CSV file
      const text = await file.text()
      console.log("CSV file read, size:", text.length)

      const rows = parseCSV(text)
      console.log("Parsed CSV rows:", rows.length)

      if (rows.length < 2) {
        throw new Error("CSV file is empty or has no data rows")
      }

      // Parse headers
      const headerRow = rows[0]
      const headerMap: { [key: string]: number } = {}

      headerRow.forEach((header, index) => {
        const field = matchHeader(header)
        if (field) {
          headerMap[field] = index
        }
      })

      console.log("Header mapping:", headerMap)

      if (!headerMap.full_name || !headerMap.email) {
        throw new Error("CSV must contain 'Name' and 'Email' columns")
      }

      // Parse data rows
      const contacts = []
      const skipped: string[] = []

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]

        const full_name = row[headerMap.full_name]?.trim()
        const email = row[headerMap.email]?.trim()

        if (!full_name || !email) {
          skipped.push(`Row ${i + 1}: Missing name or email`)
          continue
        }

        const contact: any = {
          user_id: user.id,
          full_name,
          email,
        }

        if (headerMap.company !== undefined) {
          contact.company = row[headerMap.company]?.trim() || null
        }
        if (headerMap.position !== undefined) {
          contact.position = row[headerMap.position]?.trim() || null
        }
        if (headerMap.phone !== undefined) {
          contact.phone = row[headerMap.phone]?.trim() || null
        }

        contacts.push(contact)
      }

      console.log("Valid contacts to insert:", contacts.length)
      console.log("Skipped rows:", skipped)

      if (contacts.length === 0) {
        throw new Error("No valid contacts found in CSV file")
      }

      // Insert contacts into database
      console.log("Inserting contacts into database...")
      const { data: insertedData, error: insertError } = await supabase
        .from("contacts")
        .insert(contacts)
        .select()

      if (insertError) {
        console.error("Database insert error:", insertError)
        throw new Error(`Database error: ${insertError.message}`)
      }

      console.log("Insert successful, rows inserted:", insertedData?.length || contacts.length)

      setUploadedFile(file.name)
      toast({
        title: "File uploaded successfully",
        description: `${contacts.length} contacts imported${skipped.length > 0 ? `, ${skipped.length} rows skipped` : ''}`,
      })

      // Refresh stats
      const { count: contactsCount } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      setStats(prev => ({
        ...prev,
        totalContacts: contactsCount || 0,
      }))

      // Refresh the page to show new contacts
      setTimeout(() => {
        router.refresh()
      }, 1000)

    } catch (err: any) {
      console.error("Upload error:", err)
      toast({
        title: "Upload failed",
        description: err.message || "Failed to upload contacts",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Manage your professional network.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalContacts}</div>
                <p className="text-xs text-muted-foreground mt-1">In your network</p>
              </>
            )}
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
                <div className="text-2xl font-bold">{stats.directConnections}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalContacts > 0
                    ? `${Math.round((stats.directConnections / stats.totalContacts) * 100)}% of network`
                    : "0% of network"}
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
      <Card>
        <CardHeader>
          <CardTitle>Import Contacts</CardTitle>
          <CardDescription>Upload a CSV file to import your contacts</CardDescription>
        </CardHeader>
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
              <p className="font-medium mb-1">CSV Format Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Required columns: <strong>Name</strong> and <strong>Email</strong></li>
                <li>Optional columns: Company, Job Title, Phone</li>
                <li>First row must be headers</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
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
