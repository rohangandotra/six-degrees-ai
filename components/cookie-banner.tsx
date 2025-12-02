"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import Link from "next/link"

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Check if user has already made a choice
        const consent = localStorage.getItem("cookie-consent")
        if (!consent) {
            setIsVisible(true)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem("cookie-consent", "accepted")
        setIsVisible(false)
        // Here you would typically initialize analytics
        window.location.reload() // Reload to apply consent (simple way to trigger providers)
    }

    const handleDecline = () => {
        localStorage.setItem("cookie-consent", "declined")
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
            <Card className="shadow-lg border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            <h3 className="font-semibold text-sm">We use cookies 🍪</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                We use cookies to improve your experience and analyze site usage.
                                Read our <Link href="/legal/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1" onClick={handleDecline}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={handleDecline}>
                            Decline
                        </Button>
                        <Button size="sm" onClick={handleAccept}>
                            Accept
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
