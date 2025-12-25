"use client"

import { useState, useEffect } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2, Copy, RefreshCw, ArrowLeft, MapPin, Mail, Check, Users, MessageSquare, X, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// LinkedIn icon component
const LinkedInIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 21.227.792 22 1.771 22h20.451C23.2 22 24 21.227 24 20.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
)

// Initials Avatar component
const InitialsAvatar = ({ name, size = "lg" }: { name: string; size?: "sm" | "lg" }) => {
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    const sizeClasses = size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-sm"

    return (
        <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-semibold shadow-lg`}>
            {initials}
        </div>
    )
}

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
    searchPurpose: string
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

            if (contact.source === 'shared' && contact.owner_id) {
                fetchConnectorInfo(contact.owner_id)
            } else {
                setConnector(null)
            }
        }
    }, [contact, searchPurpose])

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
        setTimeout(generateMessage, 100)
    }

    const handleBackToPathSelect = () => {
        setViewState('select-path')
        setMessagePath(null)
        setMessage('')
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

    const handleClose = () => {
        onClose()
        // Reset state after animation
        setTimeout(() => {
            setViewState('select-path')
            setMessagePath(null)
        }, 300)
    }

    const isOwnContact = contact?.source === 'own' || !contact?.owner_name

    if (!contact) return null

    // PATH SELECTION VIEW - Compact drawer on the right
    if (viewState === 'select-path') {
        return (
            <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
                    {/* Header with avatar */}
                    <div className="p-6 pb-4 border-b bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="flex gap-4">
                            <InitialsAvatar name={contact.full_name} size="lg" />
                            <div className="flex-1 min-w-0">
                                <SheetTitle className="text-2xl font-bold tracking-tight">
                                    {contact.full_name}
                                </SheetTitle>
                                <div className="mt-1 space-y-0.5">
                                    {contact.position && (
                                        <p className="text-sm text-muted-foreground truncate">{contact.position}</p>
                                    )}
                                    {contact.company && (
                                        <p className="text-sm font-medium text-foreground/80">{contact.company}</p>
                                    )}
                                </div>

                                {/* Meta info */}
                                <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                                    {contact.location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {contact.location}
                                        </span>
                                    )}
                                    {contact.linkedin_url && (
                                        <a
                                            href={contact.linkedin_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            <LinkedInIcon className="w-3 h-3" />
                                            Profile
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Connection Path - Only for shared contacts */}
                    {!isOwnContact && (
                        <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-blue-600/5 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                    <Users className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                    Connected via
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                                        {connector?.full_name || contact.owner_name}
                                    </p>
                                    {connector?.position && (
                                        <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
                                            {connector.position}
                                            {connector.company && ` @ ${connector.company}`}
                                        </p>
                                    )}
                                </div>
                                {connector?.linkedin_url && (
                                    <a
                                        href={connector.linkedin_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700"
                                    >
                                        <LinkedInIcon className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Path Selection */}
                    <div className="p-6 space-y-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            How would you like to connect?
                        </h3>

                        {/* Direct Message Option */}
                        <button
                            onClick={() => handlePathSelect('direct')}
                            className="w-full p-5 text-left rounded-xl border-2 border-transparent bg-muted/30 hover:bg-primary/5 hover:border-primary/50 transition-all duration-200 group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                                    <MessageSquare className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg">Message Directly</p>
                                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                        {isOwnContact
                                            ? "Reach out to your direct contact"
                                            : `"Hey, I noticed we're connected through ${(connector?.full_name || contact.owner_name || "").split(' ')[0]}..."`
                                        }
                                    </p>
                                </div>
                            </div>
                        </button>

                        {/* Intro Request Option */}
                        {!isOwnContact && (
                            <button
                                onClick={() => handlePathSelect('intro')}
                                className="w-full p-5 text-left rounded-xl border-2 border-transparent bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                                        <Users className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">Request an Introduction</p>
                                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                            Ask {(connector?.full_name || contact.owner_name || "").split(' ')[0]} to introduce you
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )}

                        <div className="pt-2 text-center">
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                                <Sparkles className="w-3 h-3" />
                                Warm intros have 3x higher response rates
                            </p>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        )
    }

    // COMPOSE MESSAGE VIEW - Centered modal with more space
    // Determine who we're actually messaging
    const messageRecipient = messagePath === 'intro'
        ? {
            name: connector?.full_name || contact.owner_name || '',
            position: connector?.position,
            company: connector?.company,
            linkedin_url: connector?.linkedin_url
        }
        : {
            name: contact.full_name,
            position: contact.position,
            company: contact.company,
            linkedin_url: contact.linkedin_url
        }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
                {/* Header */}
                <div className="shrink-0 bg-background border-b px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={handleBackToPathSelect}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-lg font-semibold">
                                {messagePath === 'intro' ? 'Request Introduction' : 'Compose Message'}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground truncate">
                                {messagePath === 'intro'
                                    ? `Asking ${connector?.full_name || contact.owner_name} to introduce you to ${contact.full_name}`
                                    : `Messaging ${contact.full_name}`
                                }
                            </p>
                        </div>
                        <InitialsAvatar name={messageRecipient.name} size="sm" />
                    </div>
                </div>

                {/* Body - scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Message Recipient Card - who you're actually messaging */}
                    <div className="flex gap-4 p-4 rounded-xl bg-muted/30 border">
                        <InitialsAvatar name={messageRecipient.name} size="sm" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                                {messagePath === 'intro' ? 'Messaging' : 'Reaching out to'}
                            </p>
                            <p className="font-semibold">{messageRecipient.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                                {messageRecipient.position}{messageRecipient.company && ` @ ${messageRecipient.company}`}
                            </p>
                        </div>
                        {messageRecipient.linkedin_url && (
                            <a
                                href={messageRecipient.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 self-center"
                            >
                                <LinkedInIcon className="w-5 h-5" />
                            </a>
                        )}
                    </div>

                    {/* For intro requests, also show who you want to be introduced to */}
                    {messagePath === 'intro' && (
                        <div className="flex gap-4 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50">
                            <InitialsAvatar name={contact.full_name} size="sm" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-blue-600 uppercase tracking-wide mb-0.5">
                                    Requesting introduction to
                                </p>
                                <p className="font-semibold">{contact.full_name}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {contact.position}{contact.company && ` @ ${contact.company}`}
                                </p>
                            </div>
                            {contact.linkedin_url && (
                                <a
                                    href={contact.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 self-center"
                                >
                                    <LinkedInIcon className="w-5 h-5" />
                                </a>
                            )}
                        </div>
                    )}

                    {/* Two-column layout for settings */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        {/* Goal */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Your Goal
                            </Label>
                            <Select value={purpose} onValueChange={setPurpose}>
                                <SelectTrigger className="h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Angle */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Your Angle
                            </Label>
                            <Select value={angle} onValueChange={setAngle}>
                                <SelectTrigger className="h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(ANGLE_OPTIONS[purpose] || ANGLE_OPTIONS.any).map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Message Editor */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Your Message
                            </Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={generateMessage}
                                disabled={isGenerating}
                                className="h-8 text-xs gap-1.5"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                                Regenerate
                            </Button>
                        </div>

                        {isGenerating ? (
                            <div className="h-64 flex flex-col items-center justify-center rounded-xl bg-muted/30 border-2 border-dashed">
                                <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                                <p className="text-sm text-muted-foreground">Crafting your message...</p>
                            </div>
                        ) : (
                            <div className="relative">
                                <Textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Your personalized message will appear here..."
                                    className="min-h-[240px] resize-none text-base leading-relaxed p-4 rounded-xl"
                                />
                                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                                    {message.length} characters
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="shrink-0 bg-background border-t p-4">
                    <div className="flex gap-3">
                        <Button
                            onClick={handleCopy}
                            disabled={!message}
                            variant="outline"
                            size="lg"
                            className="flex-1 h-12"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-5 h-5 mr-2" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-5 h-5 mr-2" />
                                    Copy Message
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={handleOpenLinkedIn}
                            disabled={!messageRecipient.linkedin_url}
                            size="lg"
                            className="flex-1 h-12 bg-[#0A66C2] hover:bg-[#004182]"
                        >
                            <LinkedInIcon className="w-5 h-5 mr-2" />
                            Open {messageRecipient.name.split(' ')[0]}'s LinkedIn
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
