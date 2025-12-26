"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { MessageCircle, X, Send, Loader2, CheckCircle2 } from "lucide-react"
import { usePostHog } from "posthog-js/react"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"

type WidgetState = 'closed' | 'open' | 'submitting' | 'success'

export function FeedbackWidget() {
    const [state, setState] = useState<WidgetState>('closed')
    const [feedback, setFeedback] = useState('')
    const [error, setError] = useState<string | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const posthog = usePostHog()

    // Get current user info
    const [userInfo, setUserInfo] = useState<{ id: string | null; email: string | null }>({ id: null, email: null })

    useEffect(() => {
        async function getUser() {
            const supabase = createClient()
            if (!supabase) return
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserInfo({ id: user.id, email: user.email || null })
            }
        }
        getUser()
    }, [])

    // Focus textarea when opening
    useEffect(() => {
        if (state === 'open' && textareaRef.current) {
            textareaRef.current.focus()
        }
    }, [state])

    // Reset after success
    useEffect(() => {
        if (state === 'success') {
            const timer = setTimeout(() => {
                setState('closed')
                setFeedback('')
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [state])

    const handleSubmit = async () => {
        if (!feedback.trim()) {
            setError('Please enter your feedback')
            return
        }

        setError(null)
        setState('submitting')

        try {
            // Get PostHog session ID for replay linking
            const sessionId = posthog?.get_session_id?.() || null

            const response = await fetch('/api/feedback/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    feedbackText: feedback,
                    feedbackType: 'general',
                    pageContext: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
                    userId: userInfo.id,
                    userEmail: userInfo.email,
                    posthogSessionId: sessionId,
                    metadata: {
                        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                        timestamp: new Date().toISOString()
                    }
                })
            })

            const data = await response.json()

            if (data.success) {
                setState('success')
                // Track in PostHog
                posthog?.capture('feedback_submitted', {
                    feedback_length: feedback.length,
                    page: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
                })
            } else {
                setError(data.message || 'Failed to submit feedback')
                setState('open')
            }
        } catch {
            setError('Something went wrong. Please try again.')
            setState('open')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit()
        }
    }

    return (
        <>
            {/* Floating Button */}
            <AnimatePresence>
                {state === 'closed' && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="fixed bottom-6 right-6 z-50"
                    >
                        <Button
                            size="lg"
                            onClick={() => setState('open')}
                            className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
                            aria-label="Open feedback"
                        >
                            <MessageCircle className="w-6 h-6" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Widget */}
            <AnimatePresence>
                {state !== 'closed' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)]"
                    >
                        <Card className="shadow-2xl border-primary/20 overflow-hidden">
                            <CardHeader className="pb-3 bg-primary text-primary-foreground">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-medium flex items-center gap-2">
                                        <MessageCircle className="w-5 h-5" />
                                        Send Feedback
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                                        onClick={() => {
                                            setState('closed')
                                            setError(null)
                                        }}
                                        aria-label="Close feedback"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="p-4">
                                {state === 'success' ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center py-8 text-center"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                                            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                        </div>
                                        <p className="font-medium text-foreground">Thank you!</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Your feedback helps us improve.
                                        </p>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <Textarea
                                                ref={textareaRef}
                                                placeholder="What's on your mind? Report a bug, suggest a feature, or share your thoughts..."
                                                value={feedback}
                                                onChange={(e) => setFeedback(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                disabled={state === 'submitting'}
                                                className="min-h-[120px] resize-none"
                                                maxLength={5000}
                                            />
                                            <div className="flex justify-between items-center mt-2">
                                                <p className="text-xs text-muted-foreground">
                                                    {feedback.length}/5000
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    ⌘/Ctrl + Enter to send
                                                </p>
                                            </div>
                                        </div>

                                        {error && (
                                            <p className="text-sm text-destructive">{error}</p>
                                        )}

                                        <Button
                                            onClick={handleSubmit}
                                            disabled={state === 'submitting' || !feedback.trim()}
                                            className="w-full"
                                        >
                                            {state === 'submitting' ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Send Feedback
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
