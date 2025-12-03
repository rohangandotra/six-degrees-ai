"use client"

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

interface Contact {
    id: string
    name: string
    company?: string
    position?: string
}

interface GraphNode {
    id: string
    name: string
    val: number
    color: string
    company?: string
}

interface GraphLink {
    source: string
    target: string
}

interface NetworkGraphProps {
    contacts: Contact[]
}

export default function NetworkGraph({ contacts }: NetworkGraphProps) {
    const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
        nodes: [],
        links: []
    })
    const graphRef = useRef<any>(null)

    useEffect(() => {
        if (!contacts || contacts.length === 0) return

        // Create nodes from contacts
        const nodes: GraphNode[] = contacts.map((contact) => ({
            id: contact.id,
            name: contact.name,
            val: Math.random() * 10 + 5, // Size
            color: getColorByCompany(contact.company),
            company: contact.company || 'Unknown'
        }))

        // Create links (cluster by company)
        const links: GraphLink[] = []
        const companyMap: Record<string, string[]> = {}

        contacts.forEach((contact) => {
            const company = contact.company || 'Unknown'
            if (!companyMap[company]) companyMap[company] = []
            companyMap[company].push(contact.id)
        })

        // Link contacts within same company
        Object.values(companyMap).forEach((ids) => {
            for (let i = 0; i < Math.min(ids.length - 1, 3); i++) {
                links.push({ source: ids[i], target: ids[i + 1] })
            }
        })

        setGraphData({ nodes, links })
    }, [contacts])

    const getColorByCompany = (company?: string): string => {
        if (!company) return '#6b7280'
        const hash = company.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0)
        const hue = hash % 360
        return `hsl(${hue}, 70%, 60%)`
    }

    if (contacts.length === 0) {
        return (
            <Card className="p-8">
                <div className="text-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Loading your network...</p>
                </div>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden">
            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel={(node: any) => `${node.name}\n${node.company || ''}`}
                nodeColor={(node: any) => node.color}
                nodeVal={(node: any) => node.val}
                linkColor={() => '#e5e7eb'}
                linkWidth={1}
                width={typeof window !== 'undefined' ? window.innerWidth * 0.8 : 800}
                height={600}
                backgroundColor="#000000"
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = node.name
                    const fontSize = 12 / globalScale
                    ctx.font = `${fontSize}px Sans-Serif`
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillStyle = node.color
                    ctx.beginPath()
                    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI)
                    ctx.fill()
                    ctx.fillStyle = '#ffffff'
                    ctx.fillText(label, node.x, node.y + node.val + fontSize)
                }}
            />
        </Card>
    )
}
