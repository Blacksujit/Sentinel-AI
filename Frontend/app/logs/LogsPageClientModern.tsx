'use client'

import { useMemo, useState } from 'react'
import { useRiskLogs } from '@/hooks/useRiskLogs'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Search, X, ArrowRight } from 'lucide-react'

interface LogsPageClientModernProps {
  initialLogs: any[]
  initialError?: string | null
}

export function LogsPageClientModern({ initialLogs, initialError }: LogsPageClientModernProps) {
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

  const riskBg = (score: number) =>
    score >= 0.8 ? 'bg-red-500/10 text-red-500' :
    score >= 0.6 ? 'bg-amber-500/10 text-amber-500' :
    score >= 0.4 ? 'bg-amber-500/10 text-amber-500' :
    'bg-muted text-muted-foreground'

  const decisionStyle = (label: string) =>
    label === 'allow' ? 'border-success/30 bg-success/10 text-success' :
    label === 'warn' ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' :
    label === 'escalate' ? 'border-destructive/30 bg-destructive/10 text-destructive' :
    label === 'block' ? 'border-red-500/30 bg-red-500/10 text-red-500' :
    ''

  return (
    <div className="bg-background">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[32px] font-bold tracking-tight text-foreground">Risk Events</h1>
              {hasActiveFilters && <Badge variant="outline">{activeFilterCount} filters applied</Badge>}
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              All AI interactions analyzed by SentinelAI. Use filters to isolate risky events; click a row to open the full investigation report.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-controls="audit-filters-panel"
              size="sm"
            >
              Filters
            </Button>
            <Button
              variant="outline"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              size="sm"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border border-red-500/30 bg-red-500/10">
            <CardContent className="p-6 text-center">
              <p className="text-sm font-medium text-foreground">Unable to load risk events</p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRetry} disabled={isRetrying} className="mt-4">
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filter Panel */}
        <Card className="border bg-card">
          <CardHeader className="flex flex-row items-center justify-between gap-4 border-b p-4 sm:p-6">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-foreground">Filters</CardTitle>
              <p className="text-xs text-muted-foreground">Narrow by time, decision outcome, and risk threshold.</p>
            </div>
            {hasActiveFilters && (
              <Badge variant="outline" className="font-mono text-xs">{filteredLogs.length} matches</Badge>
            )}
          </CardHeader>

          {filtersOpen && (
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Search</div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search prompts or responses"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9 pr-9"
                      />
                      {searchTerm !== '' && (
                        <button
                          type="button"
                          aria-label="Clear search"
                          onClick={() => handleSearchChange('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Date range</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1) }}
                        aria-label="Start date"
                      />
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1) }}
                        aria-label="End date"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Decision</div>
                    <Select
                      value={decision}
                      onValueChange={(v) => { setDecision(v); setCurrentPage(1) }}
                    >
                      <SelectTrigger aria-label="Decision">
                        <SelectValue placeholder="Decision" />
                      </SelectTrigger>
                      <SelectContent>
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
                    <div className="text-xs font-medium text-muted-foreground">Flags</div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          Flags
                          {selectedFlags.length > 0 ? ` (${selectedFlags.length})` : ''}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        {availableFlags.length === 0 && (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No flags</div>
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
                              onCheckedChange={() => { setSelectedFlags([]); setCurrentPage(1) }}
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
                  <div className="space-y-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--paper-raised)]/90 p-3 shadow-sm">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[color:var(--ink-soft)]">Risk score range</span>
                      <span className="font-mono text-[color:var(--ink)]">
                        {minRiskScore.toFixed(2)} &ndash; {maxRiskScore.toFixed(2)}
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
            </CardContent>
          )}
        </Card>

        {/* Logs Table */}
        <Card className="border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Audit entries</CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredLogs.length}</span> result(s).
              Rows are clickable and open the detailed investigation report.
            </p>
          </CardHeader>
          <CardContent>
            {paginatedLogs.length > 0 && !error && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[190px] text-muted-foreground">Timestamp</TableHead>
                    <TableHead className="text-muted-foreground">Prompt</TableHead>
                    <TableHead className="w-[120px] text-muted-foreground">Risk Score</TableHead>
                    <TableHead className="w-[220px] text-muted-foreground">Flags</TableHead>
                    <TableHead className="w-[110px] text-muted-foreground">Confidence</TableHead>
                    <TableHead className="w-[140px] text-muted-foreground">Decision</TableHead>
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
                    const decisionLabel = String(decision).toLowerCase()

                    return (
                      <TableRow
                        key={logId}
                        className="cursor-pointer"
                        role="link"
                        tabIndex={0}
                        aria-label={`View risk log ${String(logId)}`}
                        onClick={() => router.push(`/logs/${logId}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') router.push(`/logs/${logId}`)
                          if (e.key === ' ') { e.preventDefault(); router.push(`/logs/${logId}`) }
                        }}
                      >
                        <TableCell className="font-medium text-foreground">{createdAt.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="max-w-[520px] text-sm">
                            <div className="line-clamp-2 text-muted-foreground">
                              {promptSnippet.length > 0 ? promptSnippet : '—'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${riskBg(riskScore)}`}>
                            {riskScore.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {flags.length > 0 ? (
                              <>
                                {flags.slice(0, 2).map((f: any) => (
                                  <Badge key={String(f)} variant="outline" className="text-xs text-muted-foreground">
                                    {String(f)}
                                  </Badge>
                                ))}
                                {flags.length > 2 && (
                                  <span className="text-xs text-muted-foreground">+{flags.length - 2}</span>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {(confidence * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className={`capitalize ${decisionStyle(decisionLabel)}`}>
                              {decisionLabel}
                            </Badge>
                            <ArrowRight
                              className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                              aria-hidden="true"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}

            {!error && paginatedLogs.length === 0 && filteredLogs.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No risk events captured yet</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Once an AI system is connected, SentinelAI will automatically capture interactions here and surface risk signals for auditing and investigation.
                </p>
              </div>
            )}

            {!error && paginatedLogs.length === 0 && filteredLogs.length > 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No results for the current filters</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Try broadening the time range, lowering the risk threshold, or clearing decision and flag filters.
                </p>
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2">
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
