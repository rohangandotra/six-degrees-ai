"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, Mail, Building, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getApiUrl } from "@/lib/api-config"

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
    const [purpose, setPurpose] = useState("any")
    const [scope, setScope] = useState<"own" | "extended">("extended")
    const [results, setResults] = useState<Contact[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const { toast } = useToast()

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setIsLoading(true)
        setResults([])
        // Reset hasSearched only after we start a new valid search
        setHasSearched(false)

        try {
            console.log("Searching for:", query)
            const response = await fetch(getApiUrl("/api/search"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ query, purpose, scope }),
            })

            console.log("Search response status:", response.status)

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || "Search failed")
            }

            const data = await response.json()
            console.log("Search results:", data.results)
            setResults(data.results || [])
            setHasSearched(true)
        } catch (error: any) {
            console.error("Search error:", error)
            toast({
                title: "Search failed",
                description: error.message,
                variant: "destructive",
            })
            // setHasSearched(true) so we show empty state if it failed? 
            // Better to show error.
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto flex flex-col pt-10 md:pt-20">
            <div className={`transition-all duration-500 ease-in-out w-full font-sans ${hasSearched ? 'max-w-full' : 'max-w-3xl mx-auto text-center'}`}>

                {/* Hero Header */}
                <div className="space-y-4 mb-8">
                    <h1 className={`font-bold tracking-tight text-foreground transition-all duration-300 ${hasSearched ? 'text-2xl' : 'text-4xl md:text-5xl'}`}>
                        {hasSearched ? "Search Results" : "Who are you looking for?"}
                    </h1>
                    {!hasSearched && (
                        <p className="text-xl text-muted-foreground">
                            Search across your connections and their networks.
                        </p>
                    )}
                </div>

                {/* Search Bar */}
                <Card className="border shadow-lg mb-8 overflow-hidden">
                    <CardContent className="p-0">
                        <form onSubmit={handleSearch} className="flex flex-col md:flex-row border-b border-border/50">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    placeholder="People who work in Venture Capital..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="pl-12 h-16 text-lg border-0 focus-visible:ring-0 rounded-none bg-transparent"
                                    autoFocus
                                />
                            </div>
                            <Button type="submit" size="lg" disabled={isLoading} className="h-16 px-8 rounded-none text-base font-medium">
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
                            </Button>
                        </form>

                        {/* Filters */}
                        <div className="flex flex-wrap gap-4 items-center p-3 bg-muted/30">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Scope</span>
                                <div className="flex items-center bg-background rounded-md border p-1 h-8">
                                    <button
                                        onClick={() => setScope('own')}
                                        className={`px-3 text-xs font-medium rounded-sm transition-all h-full flex items-center ${scope === 'own' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        My Network
                                    </button>
                                    <div className="w-px h-3 bg-border mx-1" />
                                    <button
                                        onClick={() => setScope('extended')}
                                        className={`px-3 text-xs font-medium rounded-sm transition-all h-full flex items-center ${scope === 'extended' ? 'bg-blue-500/10 text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Extended Network
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 ml-auto">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Goal</span>
                                <Select value={purpose} onValueChange={setPurpose}>
                                    <SelectTrigger className="w-[140px] h-8 text-xs border-0 bg-transparent shadow-none hover:bg-background hover:shadow-sm transition-all">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">General Search</SelectItem>
                                        <SelectItem value="raise_funds">Fundraising</SelectItem>
                                        <SelectItem value="hire_talent">Hiring</SelectItem>
                                        <SelectItem value="find_mentors">Mentorship</SelectItem>
                                        <SelectItem value="explore_partnerships">Partnerships</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Area */}
                <div className="space-y-6">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                            <p>Analyzing network connections...</p>
                        </div>
                    )}

                    {!isLoading && hasSearched && results?.length === 0 && (
                        <div className="text-center py-20 text-muted-foreground">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-foreground">No matches found</h3>
                            <p className="max-w-md mx-auto mt-2">Try adjusting your query or switching to "Extended Network" to see more people.</p>
                        </div>
                    )}

                    {!isLoading && results && results.length > 0 && (
                        <div className="grid md:grid-cols-2 gap-4 text-left pb-20">
                            {results.map((contact, i) => (
                                <Card key={contact.id || i} className="group hover:shadow-md transition-all duration-200 border-border/60">
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="text-lg font-bold text-foreground line-clamp-1">{contact.full_name || 'Unknown Name'}</h3>
                                                <div className="text-sm font-medium text-muted-foreground flex flex-col">
                                                    {contact.position && <span className="line-clamp-1">{contact.position}</span>}
                                                    {contact.company && <span className="line-clamp-1">{contact.company}</span>}
                                                </div>
                                            </div>
                                            {contact.linkedin_url && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 -mr-2" asChild>
                                                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 21.227.792 22 1.771 22h20.451C23.2 22 24 21.227 24 20.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                                    </a>
                                                </Button>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2 text-xs mb-3">
                                            {contact.match_reason && (
                                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md font-medium border border-emerald-500/10">
                                                    {typeof contact.match_reason === 'string' ? contact.match_reason.split('(')[0] : 'Match'}
                                                </span>
                                            )}
                                            {contact.owner_name && (
                                                <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md border border-blue-500/10">
                                                    Via {contact.owner_name}
                                                </span>
                                            )}
                                        </div>

                                        <div className="pt-3 border-t border-border/50 flex flex-col gap-1.5 text-xs text-muted-foreground">
                                            {contact.location && <div className="flex items-center gap-2">📍 {contact.location}</div>}
                                            {contact.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {contact.email}</div>}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
