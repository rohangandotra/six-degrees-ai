"use client"

import { useState, useEffect } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2, Copy, ExternalLink, RefreshCw, ArrowLeft, MapPin, Mail, Check, Users, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// LinkedIn icon component
const LinkedInIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 21.227.792 22 1.771 22h20.451C23.2 22 24 21.227 24 20.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
)

export interface Contact {
    id: string
    full_name: string
    email?: string
    company?: string
    position?: string
    linkedin_url?: string
    location?: string
    match_reason?: string
    source?: 'own' | 'shared'
    owner_name?: string
    owner_id?: string
}

interface ConnectorInfo {
    id: string
    full_name: string
    linkedin_url?: string
    position?: string
    company?: string
}

interface ContactDrawerProps {
    contact: Contact | null
    isOpen: boolean
    onClose: () => void
    searchPurpose: string // Pre-filled from search
    userProfile?: {
        full_name: string
        position?: string
        company?: string
    }
}

type MessagePath = 'direct' | 'intro' | null
type ViewState = 'select-path' | 'compose-message'

const PURPOSE_LABELS: Record<string, string> = {
    any: "General Networking",
    raise_funds: "Fundraising",
    hire_talent: "Hiring",
    find_mentors: "Mentorship",
    explore_partnerships: "Partnerships",
}

const ANGLE_OPTIONS: Record<string, { value: string; label: string }[]> = {
    raise_funds: [
        { value: "explore_investment", label: "Explore investment opportunity" },
        { value: "get_advice", label: "Get advice on fundraising" },
        { value: "learn_experience", label: "Learn about their experience" },
    ],
    hire_talent: [
        { value: "discuss_role", label: "Discuss a potential role" },
        { value: "get_referrals", label: "Get referrals for candidates" },
        { value: "learn_hiring", label: "Learn about their hiring process" },
    ],
    find_mentors: [
        { value: "seek_guidance", label: "Seek career guidance" },
        { value: "learn_path", label: "Learn about their career path" },
        { value: "get_advice", label: "Get industry advice" },
    ],
    explore_partnerships: [
        { value: "explore_collab", label: "Explore collaboration" },
        { value: "discuss_synergies", label: "Discuss potential synergies" },
        { value: "learn_company", label: "Learn about their company" },
    ],
    any: [
        { value: "connect", label: "Simply connect and chat" },
        { value: "learn_more", label: "Learn more about what they do" },
        { value: "explore_mutual", label: "Explore mutual interests" },
    ],
}

export function ContactDrawer({
    contact,
    isOpen,
    onClose,
    searchPurpose,
    userProfile
}: ContactDrawerProps) {
    const [viewState, setViewState] = useState<ViewState>('select-path')
    const [messagePath, setMessagePath] = useState<MessagePath>(null)
    const [purpose, setPurpose] = useState(searchPurpose || 'any')
    const [angle, setAngle] = useState('')
    const [message, setMessage] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [connector, setConnector] = useState<ConnectorInfo | null>(null)
    const [isLoadingConnector, setIsLoadingConnector] = useState(false)
    const { toast } = useToast()

    // Reset state when contact changes
    useEffect(() => {
        if (contact) {
            setViewState('select-path')
            setMessagePath(null)
            setPurpose(searchPurpose || 'any')
            setAngle('')
            setMessage('')
            setCopied(false)

            // If it's a shared contact, fetch connector info
            if (contact.source === 'shared' && contact.owner_id) {
                fetchConnectorInfo(contact.owner_id)
            } else {
                setConnector(null)
            }
        }
    }, [contact, searchPurpose])

    // Set default angle when purpose changes
    useEffect(() => {
        const options = ANGLE_OPTIONS[purpose] || ANGLE_OPTIONS.any
        if (options.length > 0 && !angle) {
            setAngle(options[0].value)
        }
    }, [purpose, angle])

    const fetchConnectorInfo = async (ownerId: string) => {
        setIsLoadingConnector(true)
        try {
            const response = await fetch(`/api/users/${ownerId}`)
            if (response.ok) {
                const data = await response.json()
                setConnector(data.user)
            }
        } catch (error) {
            console.error('Failed to fetch connector info:', error)
        } finally {
            setIsLoadingConnector(false)
        }
    }

    const generateMessage = async () => {
        if (!contact) return

        setIsGenerating(true)
        try {
            const response = await fetch('/api/messages/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contact: {
                        full_name: contact.full_name,
                        position: contact.position,
                        company: contact.company,
                    },
                    connector: connector ? {
                        full_name: connector.full_name,
                        position: connector.position,
                        company: connector.company,
                    } : null,
                    user: userProfile,
                    purpose,
                    angle,
                    messagePath,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to generate message')
            }

            const data = await response.json()
            setMessage(data.message)
        } catch (error: any) {
            toast({
                title: "Generation failed",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsGenerating(false)
        }
    }

    const handlePathSelect = (path: MessagePath) => {
        setMessagePath(path)
        setViewState('compose-message')
        // Auto-generate on path selection
        setTimeout(generateMessage, 100)
    }

    const handleCopy = async () => {
        await navigator.clipboard.writeText(message)
        setCopied(true)
        toast({ title: "Copied to clipboard!" })
        setTimeout(() => setCopied(false), 2000)
    }

    const handleOpenLinkedIn = () => {
        const url = messagePath === 'intro' && connector?.linkedin_url
            ? connector.linkedin_url
            : contact?.linkedin_url

        if (url) {
            window.open(url, '_blank')
        }
    }

    const isOwnContact = contact?.source === 'own' || !contact?.owner_name

    if (!contact) return null

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-4 border-b">
                    {viewState === 'compose-message' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-fit -ml-2 mb-2"
                            onClick={() => setViewState('select-path')}
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back
                        </Button>
                    )}
                    <div className="flex items-start justify-between">
                        <div>
                            <SheetTitle className="text-xl">{contact.full_name}</SheetTitle>
                            <div className="text-sm text-muted-foreground mt-1">
                                {contact.position && <div>{contact.position}</div>}
                                {contact.company && <div className="font-medium">{contact.company}</div>}
                            </div>
                        </div>
                        {contact.linkedin_url && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                asChild
                            >
                                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
                                    <LinkedInIcon className="w-5 h-5" />
                                </a>
                            </Button>
                        )}
                    </div>

                    {/* Contact Meta */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                        {contact.location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {contact.location}
                            </span>
                        )}
                        {contact.email && (
                            <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {contact.email}
                            </span>
                        )}
                    </div>
                </SheetHeader>

                {/* Connector Card - Only for shared contacts */}
                {!isOwnContact && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-800 dark:text-blue-200 font-medium">
                                Connected via
                            </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <div>
                                <div className="font-medium text-blue-900 dark:text-blue-100">
                                    {connector?.full_name || contact.owner_name}
                                </div>
                                {connector?.position && (
                                    <div className="text-xs text-blue-700 dark:text-blue-300">
                                        {connector.position}
                                        {connector.company && ` @ ${connector.company}`}
                                    </div>
                                )}
                            </div>
                            {connector?.linkedin_url && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-700 h-8"
                                    asChild
                                >
                                    <a href={connector.linkedin_url} target="_blank" rel="noopener noreferrer">
                                        <LinkedInIcon className="w-4 h-4 mr-1" />
                                        View
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Path Selection View */}
                {viewState === 'select-path' && (
                    <div className="mt-6 space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                            How would you like to connect?
                        </h3>

                        {/* Direct Message Option */}
                        <button
                            onClick={() => handlePathSelect('direct')}
                            className="w-full p-4 text-left border rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <div className="font-medium">Message {contact.full_name.split(' ')[0]} Directly</div>
                                    <div className="text-sm text-muted-foreground">
                                        {isOwnContact
                                            ? "Reach out to your direct contact"
                                            : `"Hey, I noticed we're connected through ${connector?.full_name || contact.owner_name}..."`
                                        }
                                    </div>
                                </div>
                            </div>
                        </button>

                        {/* Intro Request Option - Only for shared contacts */}
                        {!isOwnContact && (
                            <button
                                onClick={() => handlePathSelect('intro')}
                                className="w-full p-4 text-left border rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Ask {connector?.full_name || contact.owner_name} for an Intro</div>
                                        <div className="text-sm text-muted-foreground">
                                            "Hey {(connector?.full_name || contact.owner_name || '').split(' ')[0]}, could you introduce me to {contact.full_name.split(' ')[0]}?"
                                        </div>
                                    </div>
                                </div>
                            </button>
                        )}

                        <div className="pt-4 text-center">
                            <p className="text-xs text-muted-foreground">
                                💡 Warm introductions have 3x higher response rates
                            </p>
                        </div>
                    </div>
                )}

                {/* Message Composition View */}
                {viewState === 'compose-message' && (
                    <div className="mt-6 space-y-5">
                        {/* Message Target Header */}
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                {messagePath === 'intro' ? 'Requesting intro to' : 'Messaging'}
                            </div>
                            <div className="font-medium">
                                {messagePath === 'intro'
                                    ? `${contact.full_name} via ${connector?.full_name || contact.owner_name}`
                                    : contact.full_name
                                }
                            </div>
                        </div>

                        {/* Goal Selector */}
                        <div className="space-y-2">
                            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Your Goal
                            </Label>
                            <Select value={purpose} onValueChange={setPurpose}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Angle Selector */}
                        <div className="space-y-3">
                            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Your Angle
                            </Label>
                            <RadioGroup value={angle} onValueChange={setAngle} className="space-y-2">
                                {(ANGLE_OPTIONS[purpose] || ANGLE_OPTIONS.any).map((option) => (
                                    <div key={option.value} className="flex items-center space-x-2">
                                        <RadioGroupItem value={option.value} id={option.value} />
                                        <Label htmlFor={option.value} className="font-normal cursor-pointer">
                                            {option.label}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        {/* Message Editor */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Your Message
                                </Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={generateMessage}
                                    disabled={isGenerating}
                                    className="h-7 text-xs"
                                >
                                    <RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                                    Regenerate
                                </Button>
                            </div>

                            {isGenerating ? (
                                <div className="h-48 flex items-center justify-center border rounded-md bg-muted/30">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <Textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Your personalized message will appear here..."
                                    className="min-h-[200px] resize-none"
                                />
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                            <Button
                                onClick={handleCopy}
                                disabled={!message}
                                className="flex-1"
                                variant="outline"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Message
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={handleOpenLinkedIn}
                                disabled={messagePath === 'intro' ? !connector?.linkedin_url : !contact.linkedin_url}
                                className="flex-1"
                            >
                                <LinkedInIcon className="w-4 h-4 mr-2" />
                                Open LinkedIn
                            </Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
