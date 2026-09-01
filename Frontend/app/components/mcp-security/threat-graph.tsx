'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Network, RefreshCw, AlertTriangle, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useThreatGraph } from '@/hooks/mcp-security/use-mcp-security'
import type { ThreatGraphData, ThreatNode, ThreatEdge } from '@/lib/mcp-security/types'
import { EmptyState } from '@/components/mcp-security/empty-state'

const nodeColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#14b8a6',
  info: '#6b7280',
}

const nodeLabels: Record<string, string> = {
  server: 'Server',
  tool: 'Tool',
  agent: 'Agent',
  data_source: 'Data Source',
}

export function ThreatGraph() {
  const { data, isLoading, refetch } = useThreatGraph()

  return (
    <Card className="border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Network className="h-4 w-4" />
          Threat Graph
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {!data || (data.nodes.length === 0 && data.edges.length === 0) ? (
          <EmptyState
            icon={<Network className="h-5 w-5" />}
            title="The map is blank"
            description="The threat map renders from real scan data. Until the first scan lands, there is genuinely nothing to draw."
            cta={{ label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch() }}
          />
        ) : (
          <div className="p-4">
            <GraphVisualization data={data} />
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              {Object.entries(nodeColors).filter(([k]) => k !== 'info').map(([level, color]) => (
                <span key={level} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  {level}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function GraphVisualization({ data }: { data: ThreatGraphData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredNode, setHoveredNode] = useState<ThreatNode | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const container = canvas.parentElement
    if (container) {
      canvas.width = container.clientWidth
      canvas.height = 300
    }

    // Layout nodes in a force-directed-like arrangement
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2

    // Simple circular layout
    const nodePositions = new Map<string, { x: number; y: number }>()
    const nodeCount = data.nodes.length

    data.nodes.forEach((node, i) => {
      if (nodeCount === 1) {
        nodePositions.set(node.id, { x: centerX, y: centerY })
      } else {
        const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2
        const radius = Math.min(width, height) * 0.35
        nodePositions.set(node.id, {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        })
      }
    })

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Draw edges
    data.edges.forEach(edge => {
      const source = nodePositions.get(edge.source)
      const target = nodePositions.get(edge.target)
      if (!source || !target) return

      ctx.beginPath()
      ctx.moveTo(source.x, source.y)
      ctx.lineTo(target.x, target.y)
      ctx.strokeStyle = nodeColors[edge.risk_level] || '#6b7280'
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.4
      ctx.stroke()
      ctx.globalAlpha = 1

      // Edge label
      const midX = (source.x + target.x) / 2
      const midY = (source.y + target.y) / 2
      ctx.fillStyle = '#9ca3af'
      ctx.font = '9px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(edge.relationship, midX, midY - 5)
    })

    // Draw nodes
    data.nodes.forEach(node => {
      const pos = nodePositions.get(node.id)
      if (!pos) return

      const color = nodeColors[node.risk_level] || '#6b7280'
      const nodeSize = node.type === 'server' ? 18 : 14

      // Outer ring
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, nodeSize + 4, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.15
      ctx.fill()
      ctx.globalAlpha = 1

      // Node circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, nodeSize, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()

      // Label
      ctx.fillStyle = '#1f2937'
      ctx.font = 'bold 10px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        node.label.length > 8 ? node.label.slice(0, 8) + '..' : node.label,
        pos.x,
        pos.y,
      )

      // Type badge
      ctx.fillStyle = '#6b7280'
      ctx.font = '8px Inter, sans-serif'
      ctx.fillText(nodeLabels[node.type] || node.type, pos.x, pos.y + nodeSize + 14)
    })
  }, [data])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find hovered node
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const nodeCount = data.nodes.length

    for (const node of data.nodes) {
      const idx = data.nodes.indexOf(node)
      let nx: number, ny: number
      if (nodeCount === 1) {
        nx = centerX; ny = centerY
      } else {
        const angle = (2 * Math.PI * idx) / nodeCount - Math.PI / 2
        const radius = Math.min(width, height) * 0.35
        nx = centerX + Math.cos(angle) * radius
        ny = centerY + Math.sin(angle) * radius
      }
      const dist = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2)
      if (dist < 20) {
        setHoveredNode(node)
        setTooltipPos({ x: e.clientX, y: e.clientY })
        return
      }
    }
    setHoveredNode(null)
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair"
        style={{ height: 300 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
      />
      {hoveredNode && (
        <div
          className="fixed z-50 pointer-events-none bg-popover border rounded-lg shadow-lg p-3 text-xs max-w-[200px]"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 8 }}
        >
          <p className="font-medium">{hoveredNode.label}</p>
          <p className="text-muted-foreground">{nodeLabels[hoveredNode.type]}</p>
          <p className={`mt-1 font-medium ${
            hoveredNode.risk_level === 'critical' ? 'text-[color:var(--red-text)]' :
            hoveredNode.risk_level === 'high' ? 'text-[color:var(--orange)]' :
            hoveredNode.risk_level === 'medium' ? 'text-[color:var(--yellow)]' :
            'text-[color:var(--teal)]'
          }`}>
            {hoveredNode.risk_level} risk
          </p>
        </div>
      )}
    </div>
  )
}
