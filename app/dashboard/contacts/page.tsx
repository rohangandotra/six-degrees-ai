"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Mail, Phone, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface Contact {
  id: string
  full_name: string
  email: string
  company: string
  position: string
  phone?: string
}

const degreeColors = {
  "1st": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "2nd": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "3rd": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
}

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination State
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalContacts, setTotalContacts] = useState(0)
  const LIMIT = 50

  useEffect(() => {
    async function fetchContacts() {
      setLoading(true)
      const supabase = createClient()

      if (!supabase) {
        setError("Unable to connect to database")
        setLoading(false)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setError("Please log in to view contacts")
          setLoading(false)
          return
        }

        // Fetch paginated contacts
        const response = await fetch(`/api/contacts?page=${page}&limit=${LIMIT}`)

        if (!response.ok) {
          throw new Error("Failed to fetch contacts")
        }

        const data = await response.json()
        setContacts(data.contacts || [])
        setTotalPages(data.totalPages || 1)
        setTotalContacts(data.total || 0)

      } catch (err) {
        console.error("Error:", err)
        setError("Failed to load contacts")
      } finally {
        setLoading(false)
      }
    }

    fetchContacts()
  }, [page]) // Re-fetch when page changes

  // Client-side filtering for search (only filters current page for now, 
  // ideally search should be server-side too but let's keep it simple first)
  const filteredContacts = contacts.filter(
    (contact) =>
      contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Contacts</h1>
          <p className="text-muted-foreground">
            {totalContacts > 0
              ? `Showing ${(page - 1) * LIMIT + 1}-${Math.min(page * LIMIT, totalContacts)} of ${totalContacts.toLocaleString()} contacts`
              : 'Manage and search through all your professional contacts'}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search contacts..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">Filter</Button>
        <Button>Add Contact</Button>
      </div>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contacts found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {contact.full_name?.[0] || "?"}
                    </div>
                    <div>
                      <h3 className="font-medium">{contact.full_name}</h3>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{contact.position}</span>
                        {contact.company && (
                          <>
                            <span>•</span>
                            <span>{contact.company}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {contact.email && (
                      <Button variant="ghost" size="icon" title={contact.email}>
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
