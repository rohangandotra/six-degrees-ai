"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ArrowRight, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

export default function LandingHero() {
    const router = useRouter()
    const [text, setText] = useState("")
    const fullText = "Find investors in New York..."
    const [showResult, setShowResult] = useState(false)

    // Typewriter effect
    useEffect(() => {
        let i = 0
        const timer = setInterval(() => {
            if (i < fullText.length) {
                setText(fullText.substring(0, i + 1))
                i++
            } else {
                clearInterval(timer)
                setTimeout(() => setShowResult(true), 500)
            }
        }, 100)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="z-10 text-center space-y-8 max-w-4xl px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-blue-200 mb-6 backdrop-blur-sm">
                        <Sparkles className="w-4 h-4" />
                        <span>AI-Powered Network Intelligence</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 pb-4">
                        Your Network is <br />
                        <span className="text-blue-400">More Powerful</span> Than You Think
                    </h1>
                    <p className="text-xl text-blue-100/60 max-w-2xl mx-auto">
                        Stop digging through LinkedIn. Use AI to instantly find the right introduction path across your entire team's network.
                    </p>
                </motion.div>

                {/* Interactive Demo Search */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="relative max-w-2xl mx-auto w-full"
                >
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative flex items-center bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl">
                            <Search className="w-6 h-6 text-blue-400 ml-3 mr-3" />
                            <input
                                type="text"
                                value={text}
                                readOnly
                                className="bg-transparent border-none outline-none text-lg text-white w-full placeholder-white/20 font-mono"
                                placeholder="Ask anything..."
                            />
                            <Button
                                onClick={() => router.push('/auth/sign-up')}
                                className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-6"
                            >
                                Get Started
                            </Button>
                        </div>
                    </div>

                    {/* Mock Result Card */}
                    {showResult && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 10 }}
                            className="absolute top-full left-0 right-0 mt-4 bg-black/90 border border-white/10 rounded-xl p-4 backdrop-blur-md shadow-2xl text-left"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                                    JD
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold">John Doe</h3>
                                    <p className="text-sm text-blue-200/60">Partner at Sequoia Capital</p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full w-fit">
                                        <ArrowRight className="w-3 h-3" />
                                        <span>Best Path: You → Sarah → John</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
