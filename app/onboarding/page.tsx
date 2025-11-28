"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react"
import {
    INDUSTRY_OPTIONS,
    COMPANY_STAGE_OPTIONS,
    GOAL_OPTIONS,
    INTEREST_OPTIONS,
    CONNECTION_TYPE_OPTIONS
} from "@/lib/constants/profile-options"
import { createClient } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/api-config"

export default function OnboardingPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        current_role: "",
        current_company: "",
        industry: "",
        company_stage: "",
        location_city: "",
        location_country: "",
        goals: [] as string[],
        interests: [] as string[],
        seeking_connections: [] as string[]
    })

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleMultiSelect = (field: "goals" | "interests" | "seeking_connections", value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].includes(value)
                ? prev[field].filter(item => item !== value)
                : [...prev[field], value]
        }))
    }

    const validateStep = () => {
        switch (step) {
            case 1:
                if (!formData.current_role.trim()) {
                    toast({ title: "Current role is required", variant: "destructive" })
                    return false
                }
                break
            case 2:
                if (!formData.current_company.trim()) {
                    toast({ title: "Current company is required", variant: "destructive" })
                    return false
                }
                break
            case 3:
                if (!formData.industry) {
                    toast({ title: "Industry is required", variant: "destructive" })
                    return false
                }
                break
            case 5:
                if (!formData.location_city.trim()) {
                    toast({ title: "City is required", variant: "destructive" })
                    return false
                }
                break
        }
        return true
    }

    const handleNext = () => {
        if (validateStep()) {
            setStep(prev => prev + 1)
        }
    }

    const handlePrevious = () => {
        setStep(prev => prev - 1)
    }

    const handleSubmit = async () => {
        if (!validateStep()) return

        setIsSubmitting(true)

        try {
            const supabase = createClient()

            if (!supabase) {
                throw new Error("Failed to initialize Supabase client")
            }

            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                throw new Error("Not authenticated")
            }

            const response = await fetch(getApiUrl("/api/profile"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.id,
                    ...formData
                })
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to create profile")
            }

            toast({
                title: "Profile completed!",
                description: "Welcome to 6th Degree"
            })

            // Redirect to dashboard
            router.push("/dashboard")

        } catch (error: any) {
            console.error("Onboarding error:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to complete profile",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-3xl">Complete Your Profile</CardTitle>
                    <CardDescription>Help us personalize your experience (Step {step} of 8)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(step / 8) * 100}%` }}
                        />
                    </div>

                    {/* Step 1: Current Role */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold mb-2">What's your current role?</h3>
                                <Label htmlFor="current_role">Current Role *</Label>
                                <Input
                                    id="current_role"
                                    placeholder="e.g., Product Manager, Software Engineer, CEO"
                                    value={formData.current_role}
                                    onChange={(e) => handleInputChange("current_role", e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Current Company */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold mb-2">What company do you work at?</h3>
                                <Label htmlFor="current_company">Current Company *</Label>
                                <Input
                                    id="current_company"
                                    placeholder="e.g., Google, Stripe, your startup name"
                                    value={formData.current_company}
                                    onChange={(e) => handleInputChange("current_company", e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Industry */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Which industry are you in?</h3>
                                <Label htmlFor="industry">Industry *</Label>
                                <Select value={formData.industry} onValueChange={(value) => handleInputChange("industry", value)}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select industry" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {INDUSTRY_OPTIONS.map(option => (
                                            <SelectItem key={option} value={option}>{option}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Company Stage */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold mb-2">What's your company stage?</h3>
                                <p className="text-sm text-muted-foreground mb-2">Optional</p>
                                <Select value={formData.company_stage} onValueChange={(value) => handleInputChange("company_stage", value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select company stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COMPANY_STAGE_OPTIONS.map(option => (
                                            <SelectItem key={option} value={option}>{option}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Location */}
                    {step === 5 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold mb-2">Where are you based?</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="location_city">City *</Label>
                                    <Input
                                        id="location_city"
                                        placeholder="e.g., San Francisco"
                                        value={formData.location_city}
                                        onChange={(e) => handleInputChange("location_city", e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="location_country">Country</Label>
                                    <Input
                                        id="location_country"
                                        placeholder="e.g., USA"
                                        value={formData.location_country}
                                        onChange={(e) => handleInputChange("location_country", e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 6: Goals */}
                    {step === 6 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold mb-2">What are your main goals?</h3>
                                <p className="text-sm text-muted-foreground mb-4">Select all that apply (Optional)</p>
                                <div className="space-y-2">
                                    {GOAL_OPTIONS.map(option => (
                                        <div key={option} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`goal-${option}`}
                                                checked={formData.goals.includes(option)}
                                                onCheckedChange={() => handleMultiSelect("goals", option)}
                                            />
                                            <Label htmlFor={`goal-${option}`} className="cursor-pointer">{option}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 7: Interests */}
                    {step === 7 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold mb-2">What topics are you interested in?</h3>
                                <p className="text-sm text-muted-foreground mb-4">Select all that apply (Optional)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {INTEREST_OPTIONS.map(option => (
                                        <div key={option} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`interest-${option}`}
                                                checked={formData.interests.includes(option)}
                                                onCheckedChange={() => handleMultiSelect("interests", option)}
                                            />
                                            <Label htmlFor={`interest-${option}`} className="cursor-pointer">{option}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 8: Seeking Connections */}
                    {step === 8 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Who are you most interested in connecting with?</h3>
                                <p className="text-sm text-muted-foreground mb-4">Select all that apply (Optional)</p>
                                <div className="space-y-2">
                                    {CONNECTION_TYPE_OPTIONS.map(option => (
                                        <div key={option} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`connection-${option}`}
                                                checked={formData.seeking_connections.includes(option)}
                                                onCheckedChange={() => handleMultiSelect("seeking_connections", option)}
                                            />
                                            <Label htmlFor={`connection-${option}`} className="cursor-pointer">{option}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between pt-6">
                        <Button
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={step === 1}
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Previous
                        </Button>

                        {step < 8 ? (
                            <Button onClick={handleNext}>
                                Next
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Completing...
                                    </>
                                ) : (
                                    "Complete Profile"
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
