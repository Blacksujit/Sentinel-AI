'use client'

import { useMemo, useState } from 'react'
import { useRiskLogs } from '@/hooks/useRiskLogs'
import { useCursorInteractions } from '@/hooks/useCursorInteractions'
import { useRouter } from 'next/navigation'
import { Badge, Button, Input, Slider } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronUp, Search, X, ArrowRight } from 'lucide-react'
import { 
  MotionCard,
  staggerContainer,
  slideUp,
  hoverScaleLift,
  hoverGlow,
  riskLevelAnimations,
  buttonPress,
  filterPanel
} from '@/components/ui/motion'

interface LogsPageClientModernProps {
  initialLogs: any[]
  initialError?: string | null
}

export function LogsPageClientModern({ initialLogs, initialError }: LogsPageClientModernProps) {
  const { registerInteractiveElement } = useCursorInteractions()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minRiskScore, setMinRiskScore] = useState(0)
  const [maxRiskScore, setMaxRiskScore] = useState(1)
  const [decision, setDecision] = useState<string>('all')
  const [selectedFlags, setSelectedFlags] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState<string | null>(initialError || null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const pageSize = 10

  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm !== '' ||
      startDate !== '' ||
      endDate !== '' ||
      minRiskScore !== 0 ||
      maxRiskScore !== 1 ||
      decision !== 'all' ||
      selectedFlags.length > 0
    )
  }, [decision, endDate, maxRiskScore, minRiskScore, searchTerm, selectedFlags.length, startDate])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchTerm !== '') count += 1
    if (startDate !== '') count += 1
    if (endDate !== '') count += 1
    if (minRiskScore !== 0 || maxRiskScore !== 1) count += 1
    if (decision !== 'all') count += 1
    if (selectedFlags.length > 0) count += 1
    return count
  }, [decision, endDate, maxRiskScore, minRiskScore, searchTerm, selectedFlags.length, startDate])

  const availableFlags = Array.from(
    new Set(
      (initialLogs ?? [])
        .flatMap((log) => (Array.isArray(log?.flags) ? log.flags : []))
        .filter((f): f is string => typeof f === 'string' && f.length > 0)
    )
  ).sort()

  const filteredLogs = initialLogs ? initialLogs.filter(log => {
    if (!log) return false
    const matchesSearch = searchTerm === '' || 
      (log.prompt && typeof log.prompt === 'string' && log.prompt.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.response && typeof log.response === 'string' && log.response.toLowerCase().includes(searchTerm.toLowerCase()))

    const riskScore = typeof log.final_risk_score === 'number' ? log.final_risk_score : 0

    const createdAt = log?.created_at ? new Date(log.created_at) : null
    const startOk = !startDate || (createdAt ? createdAt >= new Date(startDate + 'T00:00:00') : true)
    const endOk = !endDate || (createdAt ? createdAt <= new Date(endDate + 'T23:59:59') : true)

    const matchesRiskScore = riskScore >= minRiskScore && riskScore <= maxRiskScore

    const flags = Array.isArray(log?.flags) ? log.flags : []
    const matchesFlags = selectedFlags.length === 0 || selectedFlags.every((f) => flags.includes(f))

    const logDecision = typeof log?.decision === 'string' ? log.decision : ''
    const matchesDecision = decision === 'all' || logDecision === decision

    return matchesSearch && startOk && endOk && matchesRiskScore && matchesFlags && matchesDecision
  }) : []

  const totalPages = Math.ceil(filteredLogs.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize)

  const handleRetry = async () => {
    setIsRetrying(true)
    setError(null)
    try {
      const response = await fetch('/api/logs?limit=50', { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      await response.json()
      setError(null)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry fetching logs')
    } finally {
      setIsRetrying(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStartDate('')
    setEndDate('')
    setMinRiskScore(0)
    setMaxRiskScore(1)
    setDecision('all')
    setSelectedFlags([])
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-gradient-navy">
      {/* Premium animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
      
      <div className="relative z-10 space-y-8 p-6">
        {/* Design intent: provide calm context so the page "explains itself" as an audit console. */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <motion.div variants={slideUp} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Interaction Audit Logs</h1>
              {hasActiveFilters && <Badge className="badge-premium">{activeFilterCount} filters applied</Badge>}
            </div>
            <p className="max-w-3xl text-sm text-muted">
              Logs are captured from connected AI systems and analyzed for safety, policy compliance, and potential escalation.
              Use filters to isolate risky interactions and open an entry to view the full investigation report.
            </p>
          </motion.div>

          <motion.div variants={slideUp} className="flex flex-wrap items-center gap-2">
            <motion.div {...buttonPress}>
              <Button
                variant="outline"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                aria-controls="audit-filters-panel"
                className="btn-premium-outline"
              >
                Filters
                {filtersOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
            </motion.div>
            <motion.div {...buttonPress}>
              <Button
                variant="outline"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="btn-premium-outline"
              >
                Reset
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Error State */}
        {error && (
          <MotionCard className="card-premium border-risk/30 bg-risk/10 p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-medium text-risk-high">Unable to load risk logs</h3>
              <p className="text-muted">{error}</p>
              <motion.div {...buttonPress}>
                <Button variant="outline" onClick={handleRetry} disabled={isRetrying} className="btn-premium-outline">
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
              </motion.div>
            </div>
          </MotionCard>
        )}

        {/* Design intent: filters behave like a control panel (grouped, calm, and easily reset). */}
        <MotionCard className="card-premium p-0" {...hoverGlow}>
          <div className="flex items-center justify-between gap-4 border-b border-white/10 p-4 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Control panel</h2>
              <p className="text-xs text-muted">
                Narrow by time, decision outcome, and risk threshold.
              </p>
            </div>
            {hasActiveFilters && (
              <Badge className="badge-premium font-mono">{filteredLogs.length} matches</Badge>
            )}
          </div>

          <AnimatePresence initial={false}>
            {filtersOpen && (
              <motion.div
                key="filter-panel"
                id="audit-filters-panel"
                variants={filterPanel}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted">Search</div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <Input
                          placeholder="Search prompts or responses"
                          value={searchTerm}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          className="input-premium pl-9 pr-9"
                        />
                        {searchTerm !== '' && (
                          <button
                            type="button"
                            aria-label="Clear search"
                            onClick={() => handleSearchChange('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted">Date range</div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value)
                            setCurrentPage(1)
                          }}
                          aria-label="Start date"
                          className="input-premium"
                        />
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value)
                            setCurrentPage(1)
                          }}
                          aria-label="End date"
                          className="input-premium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted">Decision</div>
                      <Select
                        value={decision}
                        onValueChange={(v) => {
                          setDecision(v)
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger aria-label="Decision" className="input-premium">
                          <SelectValue placeholder="Decision" />
                        </SelectTrigger>
                        <SelectContent className="card-premium border-white/10">
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="allow">allow</SelectItem>
                          <SelectItem value="warn">warn</SelectItem>
                          <SelectItem value="block">block</SelectItem>
                          <SelectItem value="escalate">escalate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted">Flags</div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="btn-premium-outline w-full justify-between">
                            Flags
                            {selectedFlags.length > 0 ? ` (${selectedFlags.length})` : ''}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="card-premium border-white/10 w-64">
                          {availableFlags.length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-muted">No flags</div>
                          )}
                          {availableFlags.map((flag) => (
                            <DropdownMenuCheckboxItem
                              key={flag}
                              checked={selectedFlags.includes(flag)}
                              onCheckedChange={(checked) => {
                                setSelectedFlags((prev) => {
                                  const next = checked ? Array.from(new Set([...prev, flag])) : prev.filter((f) => f !== flag)
                                  return next
                                })
                                setCurrentPage(1)
                              }}
                            >
                              {flag}
                            </DropdownMenuCheckboxItem>
                          ))}
                          {availableFlags.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuCheckboxItem
                                checked={selectedFlags.length === 0}
                                onCheckedChange={() => {
                                  setSelectedFlags([])
                                  setCurrentPage(1)
                                }}
                              >
                                Clear selection
                              </DropdownMenuCheckboxItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="lg:col-span-12">
                    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">Risk score range</span>
                        <span className="font-mono text-foreground">
                          {minRiskScore.toFixed(2)} – {maxRiskScore.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        value={[minRiskScore, maxRiskScore]}
                        min={0}
                        max={1}
                        step={0.01}
                        aria-label="Risk score range"
                        aria-valuetext={`${minRiskScore.toFixed(2)} to ${maxRiskScore.toFixed(2)}`}
                        onValueChange={(v) => {
                          const nextMin = Array.isArray(v) && typeof v[0] === 'number' ? v[0] : 0
                          const nextMax = Array.isArray(v) && typeof v[1] === 'number' ? v[1] : 1
                          setMinRiskScore(Math.min(Math.max(nextMin, 0), 1))
                          setMaxRiskScore(Math.min(Math.max(nextMax, 0), 1))
                          setCurrentPage(1)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </MotionCard>

        {/* Logs Table */}
        <MotionCard className="card-premium p-6" {...hoverGlow}>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Audit entries</h2>
              <p className="text-sm text-muted">
                Showing <span className="font-medium text-foreground">{filteredLogs.length}</span> result(s).
                Rows are clickable and open the detailed investigation report.
              </p>
            </div>

            {paginatedLogs.length > 0 && !error && (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="w-[190px] text-muted">Timestamp</TableHead>
                    <TableHead className="text-muted">Prompt</TableHead>
                    <TableHead className="w-[120px] text-muted">Risk Score</TableHead>
                    <TableHead className="w-[220px] text-muted">Flags</TableHead>
                    <TableHead className="w-[110px] text-muted">Confidence</TableHead>
                    <TableHead className="w-[140px] text-muted">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log, index) => {
                    const logId = log?.id || 'Unknown'
                    const createdAt = log?.created_at ? new Date(log.created_at) : new Date()
                    const riskScore = typeof log?.final_risk_score === 'number' ? log.final_risk_score : 0
                    const flags = Array.isArray(log?.flags) ? log.flags : []
                    const confidence = typeof log?.confidence === 'number' ? log.confidence : 0
                    const decision = log?.decision || 'Unknown'
                    const promptSnippet = typeof log?.prompt === 'string' ? log.prompt : ''

                    const riskVariant =
                      riskScore >= 0.8 ? 'critical' : riskScore >= 0.6 ? 'high' : riskScore >= 0.4 ? 'medium' : 'low'

                    const decisionLabel = String(decision).toLowerCase()
                    const decisionClassName =
                      decisionLabel === 'allow'
                        ? 'border-success/30 bg-success/10 text-success'
                        : decisionLabel === 'warn'
                          ? 'border-warning/30 bg-warning/10 text-warning'
                          : decisionLabel === 'escalate'
                            ? 'border-electric-violet/30 bg-electric-violet/10 text-electric-violet'
                            : decisionLabel === 'block'
                              ? 'border-risk-high/30 bg-risk-high/10 text-risk-high'
                              : ''

                    return (
                      <motion.tr
                        key={logId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={cn(
                          'group cursor-pointer transition-all border-b border-white/5',
                          index % 2 === 0 ? 'bg-black/20' : 'bg-black/10',
                          'hover:bg-black/30',
                          riskVariant === 'critical' ? 'hover:shadow-glow-risk' : 
                          riskVariant === 'high' ? 'hover:shadow-glow-warning' : 
                          'hover:shadow-glow',
                          'focus-visible:bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2'
                        )}
                        role="link"
                        ref={(el: HTMLElement | null) => {
                          if (el) registerInteractiveElement(el, riskVariant === 'critical' ? 'critical' : riskVariant === 'high' ? 'high' : riskVariant === 'medium' ? 'medium' : 'low')
                        }}
                        tabIndex={0}
                        aria-label={`View risk log ${String(logId)}`}
                        onClick={() => router.push(`/logs/${logId}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') router.push(`/logs/${logId}`)
                          if (e.key === ' ') {
                            e.preventDefault()
                            router.push(`/logs/${logId}`)
                          }
                        }}
                      >
                        <TableCell className="font-medium text-foreground">{createdAt.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="max-w-[520px] text-sm">
                            <div className="line-clamp-2 text-muted">
                              {promptSnippet.length > 0 ? promptSnippet : '—'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            riskVariant === 'critical' ? 'badge-risk' :
                            riskVariant === 'high' ? 'badge-warning' :
                            riskVariant === 'medium' ? 'badge-premium' :
                            'badge-premium'
                          }>
                            {riskScore.toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {flags.length > 0 ? (
                              <>
                                {flags.slice(0, 2).map((f: any) => (
                                  <Badge key={String(f)} variant="outline" className="text-xs border-white/20 text-muted">
                                    {String(f)}
                                  </Badge>
                                ))}
                                {flags.length > 2 && (
                                  <span className="text-xs text-muted">+{flags.length - 2}</span>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-muted">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted">
                          {(confidence * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className={cn('capitalize', decisionClassName)}>
                              {decisionLabel}
                            </Badge>
                            <ArrowRight
                              className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                              aria-hidden="true"
                            />
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })}
                </TableBody>
              </Table>
            )}

            {!error && paginatedLogs.length === 0 && filteredLogs.length === 0 && (
              <MotionCard className="card-premium border-white/10 bg-black/20 p-8 text-center">
                <h3 className="text-lg font-medium text-foreground mb-2">No logs captured yet</h3>
                <p className="text-sm text-muted">
                  Once an AI system is connected, SentinelAI will automatically capture interactions here and surface risk signals for
                  auditing and investigation.
                </p>
              </MotionCard>
            )}

            {!error && paginatedLogs.length === 0 && filteredLogs.length > 0 && (
              <MotionCard className="card-premium border-white/10 bg-black/20 p-8 text-center">
                <h3 className="text-lg font-medium text-foreground mb-2">No results for the current filters</h3>
                <p className="text-sm text-muted mb-4">
                  Try broadening the time range, lowering the risk threshold, or clearing decision/flag filters.
                </p>
                <motion.div {...buttonPress}>
                  <Button variant="outline" onClick={resetFilters} className="btn-premium-outline">
                    Clear All Filters
                  </Button>
                </motion.div>
              </MotionCard>
            )}
          </div>
        </MotionCard>

        {/* Pagination */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center space-x-2"
        >
          <motion.div {...buttonPress}>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="btn-premium-outline"
            >
              Previous
            </Button>
          </motion.div>
          <span className="text-sm text-muted">
            Page {currentPage} of {totalPages || 1}
          </span>
          <motion.div {...buttonPress}>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="btn-premium-outline"
            >
              Next
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
