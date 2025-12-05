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
        setHasSearched(true)
        setResults([])

        try {
            const response = await fetch(getApiUrl("/api/search"), {
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
        <div className={`min-h-[85vh] transition-all duration-500 ease-in-out flex flex-col ${hasSearched ? 'justify-start pt-6' : 'justify-center items-center -mt-10'}`}>
            <div className={`w-full max-w-4xl mx-auto px-4 space-y-8 transition-all duration-500 ${hasSearched ? '' : 'text-center'}`}>

                {/* Hero Header (Centered initially, moves up) */}
                <div className="space-y-4">
                    <h1 className={`font-bold tracking-tight text-foreground transition-all duration-500 ${hasSearched ? 'text-2xl' : 'text-4xl md:text-5xl'}`}>
                        {hasSearched ? "Search Results" : "Who are you looking for?"}
                    </h1>
                    {!hasSearched && (
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Search across your connections and their networks using natural language.
                        </p>
                    )}
                </div>

                {/* Search Bar */}
                <Card className={`border-0 border-b-0 shadow-lg transition-all duration-300 ${hasSearched ? 'shadow-sm border' : 'shadow-xl'}`}>
                    <CardContent className="p-2 md:p-3">
                        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    placeholder="Try 'Investors in web3' or 'Product Designers in SF'"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="pl-12 h-14 text-lg border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                                    autoFocus
                                />
                            </div>
                            <Button type="submit" size="lg" disabled={isLoading} className="h-14 px-8 text-lg font-medium rounded-md shadow-none hover:shadow-md transition-all">
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
                            </Button>
                        </form>
                    </CardContent>

                    {/* Filters Bar (Integrated) */}
                    <div className="px-4 pb-3 flex flex-wrap gap-4 items-center border-t border-border/40 pt-3 bg-muted/20">
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Scope</span>
                            <div className="flex bg-background rounded-md border p-1 h-8 items-center">
                                <button
                                    onClick={() => setScope('own')}
                                    className={`px-3 text-xs font-medium rounded-sm transition-all h-full flex items-center ${scope === 'own' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    My Network
                                </button>
                                <div className="w-px h-4 bg-border mx-1" />
                                <button
                                    onClick={() => setScope('extended')}
                                    className={`px-3 text-xs font-medium rounded-sm transition-all h-full flex items-center ${scope === 'extended' ? 'bg-blue-500/10 text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Extended Network
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Goal</span>
                            <Select value={purpose} onValueChange={setPurpose}>
                                <SelectTrigger className="w-[140px] h-8 text-xs border-0 bg-transparent shadow-none hover:bg-muted/50">
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
                </Card>

                {/* Results Area */}
                <div className="space-y-6 pt-4">
                    {isLoading && (
                        <div className="text-center py-20">
                            <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/5 mb-4">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                            <p className="text-muted-foreground animate-pulse">Analyzing network connections...</p>
                        </div>
                    )}

                    {!isLoading && hasSearched && results.length === 0 && (
                        <div className="text-center py-20 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
                            <div className="inline-flex items-center justify-center p-6 rounded-full bg-muted mb-4">
                                <Search className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground">No matches found</h3>
                            <p className="text-muted-foreground">Try broadening your search or checking your extended network.</p>
                        </div>
                    )}

                    {!isLoading && results.length > 0 && (
                        <div className="grid md:grid-cols-2 gap-4 opacity-0 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-forwards text-left" style={{ animationDelay: '100ms' }}>
                            {results.map((contact, i) => (
                                <Card key={contact.id} className="group hover:shadow-lg transition-all duration-300 border-border/60 hover:border-primary/20">
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{contact.full_name}</h3>
                                                {contact.position && <p className="text-sm font-medium text-muted-foreground">{contact.position}</p>}
                                                {contact.company && <p className="text-sm text-muted-foreground">{contact.company}</p>}
                                            </div>
                                            {contact.linkedin_url && (
                                                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-blue-50 text-blue-600 rounded-full">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 21.227.792 22 1.771 22h20.451C23.2 22 24 21.227 24 20.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                                </a>
                                            )}
                                        </div>

                                        {/* Badges */}
                                        <div className="flex flex-wrap gap-2 text-xs mb-4">
                                            {contact.match_reason && (
                                                <span className="bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-md font-medium">
                                                    {contact.match_reason}
                                                </span>
                                            )}
                                            {contact.owner_name && (
                                                <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md flex items-center gap-1">
                                                    Via {contact.owner_name}
                                                </span>
                                            )}
                                        </div>

                                        <div className="pt-3 border-t border-dashed border-border/50 flex flex-col gap-1.5">
                                            {contact.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" /> {contact.email}</div>}
                                            {contact.location && <div className="flex items-center gap-2 text-sm text-muted-foreground">📍 {contact.location}</div>}
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
