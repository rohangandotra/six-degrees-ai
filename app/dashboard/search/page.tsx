"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, ArrowLeft, Mail, Building, Briefcase } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Contact {
    id: string
    full_name: string
    email?: string
    company?: string
    position?: string
    linkedin_url?: string
    location?: string
    keywords?: string[]
    match_reason?: string
    source?: 'own' | 'shared'
    owner_name?: string
}

export default function SearchPage() {
    const [query, setQuery] = useState("")
    const [scope, setScope] = useState<"own" | "extended">("extended")
    const [results, setResults] = useState<Contact[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const router = useRouter()
    const { toast } = useToast()

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setIsLoading(true)
        setHasSearched(true)
        setResults([])

        try {
            const response = await fetch("/api/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ query, purpose, scope }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || "Search failed")
            }

            const data = await response.json()
            setResults(data.results || [])
        } catch (error: any) {
            console.error("Search error:", error)
            toast({
                title: "Search failed",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">AI Network Search</h1>
                    <p className="text-sm md:text-base text-muted-foreground">Ask questions about your network in plain English.</p>
                </div>
            </div>

            {/* Search Bar */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="E.g., 'Find investors in New York' or 'Software engineers at Google'"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-9 h-12 text-base md:text-lg"
                                autoFocus
                            />
                        </div>
                        <Button type="submit" size="lg" disabled={isLoading} className="h-12 px-8 w-full md:w-auto">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
                        </Button>
                    </form>

                    <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground font-medium">Purpose:</span>
                            <Select value={purpose} onValueChange={setPurpose}>
                                <SelectTrigger className="w-full md:w-[200px] h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">Any</SelectItem>
                                    <SelectItem value="raise_funds">Raise funds</SelectItem>
                                    <SelectItem value="hire_talent">Hire talent</SelectItem>
                                    <SelectItem value="find_mentors">Find mentors</SelectItem>
                                    <SelectItem value="explore_partnerships">Explore partnerships</SelectItem>
                                    <SelectItem value="get_advice">Get advice</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                            <Button
                                variant={scope === 'own' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setScope('own')}
                                className="text-xs h-8"
                            >
                                My Network
                            </Button>
                            <Button
                                variant={scope === 'extended' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setScope('extended')}
                                className="text-xs h-8"
                            >
                                Extended Network
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-4">
                {isLoading && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p>Searching your network...</p>
                    </div>
                )}

                {!isLoading && hasSearched && results.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No contacts found</p>
                        <p>Try adjusting your search query or expanding your scope.</p>
                    </div>
                )}

                {!isLoading && results.length > 0 && (
                    <>
                        <p className="text-sm text-muted-foreground font-medium">
                            Found {results.length} result{results.length !== 1 && 's'}
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                            {results.map((contact) => (
                                <Card key={contact.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex flex-col gap-1 mb-2">
                                                    <h3 className="text-lg font-semibold text-foreground">{contact.full_name}</h3>

                                                    {/* Source Badge */}
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {contact.source === 'own' && (
                                                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                                                                Direct Connection
                                                            </span>
                                                        )}

                                                        {contact.source === 'shared' && (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 w-fit">
                                                                    Extended Network
                                                                </span>
                                                                {/* Show connectors */}
                                                                {(contact as any).connected_via && (contact as any).connected_via.length > 0 && (
                                                                    <span className="text-xs text-muted-foreground ml-1">
                                                                        via {(contact as any).connected_via.join(", ")}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>
                                            </div>
                                            {contact.linkedin_url && (
                                                <a
                                                    href={contact.linkedin_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded hover:underline"
                                                >
                                                    LinkedIn
                                                </a>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardContent className="space-y-2 text-sm pt-0">
                                        {contact.match_reason && (
                                            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded w-fit mb-2">
                                                {contact.match_reason}
                                            </div>
                                        )}
                                        {contact.position && (
                                            <div className="flex items-center gap-2 text-foreground/80">
                                                <Briefcase className="w-4 h-4 text-muted-foreground" />
                                                <span>{contact.position}</span>
                                            </div>
                                        )}
                                        {contact.company && (
                                            <div className="flex items-center gap-2 text-foreground/80">
                                                <Building className="w-4 h-4 text-muted-foreground" />
                                                <span>{contact.company}</span>
                                            </div>
                                        )}
                                        {contact.email && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Mail className="w-4 h-4" />
                                                <span>{contact.email}</span>
                                            </div>
                                        )}
                                        {contact.location && (
                                            <div className="text-xs text-muted-foreground mt-2">
                                                📍 {contact.location}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
