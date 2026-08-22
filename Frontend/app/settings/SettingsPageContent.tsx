"use client"

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Button, Separator, Label, Badge } from '@/components/ui'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { History, RotateCcw, Save, Settings2, Activity, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

type DetectionMetrics = {
  detection_rate: number
  false_negative_rate: number
  false_positive_rate: number
  avg_detection_time_ms: number
  new_patterns_last_24h: number
  pending_review: number
}

type FeedbackStats = {
  total_feedback: number
  user_reported: number
  auto_detected: number
  reviewed: number
  used_for_training: number
  by_category: Record<string, number>
  recent_trend: Array<Record<string, unknown>>
}

type Settings = {
  warn_threshold: number
  escalate_threshold: number
  confidence_floor: number
  signal_weights: {
    prompt_anomaly: number
    jailbreak_attempt: number
    unsafe_output: number
  }
  enforcement_mode: 'allow' | 'warn' | 'escalate'
  pii_redaction_enabled: boolean
  version: number
  updated_at?: string
}

type SettingsHistoryEntry = {
  id: number
  settings_id: number
  version: number
  settings_snapshot: any
  thresholds_applied: any
  created_at: string
  updated_by?: string
}

const DEFAULT_SETTINGS: Settings = {
  warn_threshold: 0.3,
  escalate_threshold: 0.7,
  confidence_floor: 0.5,
  signal_weights: {
    prompt_anomaly: 0.3,
    jailbreak_attempt: 0.4,
    unsafe_output: 0.3
  },
  enforcement_mode: 'warn',
  pii_redaction_enabled: true,
  version: 1
}

export default function SettingsPageContent() {
  const { getToken } = useAuth()
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [initialSettings, setInitialSettings] = useState<Settings | null>(null)
  const [wasReset, setWasReset] = useState(false)
  const [history, setHistory] = useState<SettingsHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [totalHistory, setTotalHistory] = useState(0)

  const [metrics, setMetrics] = useState<DetectionMetrics | null>(null)
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null)
  const [cockpitLoading, setCockpitLoading] = useState(true)

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        let token = null
        try { token = await getToken() } catch (e) { console.warn('getToken failed:', e) }
        const response = await fetch('/api/settings', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
          setInitialSettings(data)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
        toast.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true)
      try {
        let token = null
        try { token = await getToken() } catch (e) { console.warn('getToken failed:', e) }
        const response = await fetch(`/api/settings/history?limit=10&page=${historyPage}`, {
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (!response.ok) {
          const msg = await response.text()
          throw new Error(msg || `HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        if (Array.isArray(data)) {
          setHistory(data as SettingsHistoryEntry[])
          setTotalHistory(data.length)
        } else {
          setHistory([])
          setTotalHistory(0)
        }
      } catch (error) {
        console.error('Failed to load settings history:', error)
        setHistory([])
        setTotalHistory(0)
      } finally {
        setHistoryLoading(false)
      }
    }

    loadHistory()
  }, [historyPage])

  // Load detection performance (FP tuning cockpit)
  useEffect(() => {
    const loadCockpit = async () => {
      try {
        let token = null
        try { token = await getToken() } catch (e) { console.warn('getToken failed:', e) }
        const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

        const [metricsResponse, statsResponse] = await Promise.all([
          fetch('/api/learning/metrics', { cache: 'no-store', headers: authHeaders }),
          fetch('/api/learning/feedback/stats', { cache: 'no-store', headers: authHeaders }),
        ])

        if (metricsResponse.ok) setMetrics(await metricsResponse.json())
        if (statsResponse.ok) setFeedbackStats(await statsResponse.json())
      } catch (error) {
        console.error('Failed to load detection metrics:', error)
      } finally {
        setCockpitLoading(false)
      }
    }

    loadCockpit()
  }, [getToken])

  // Reset to defaults
  const resetToDefaults = async () => {
    try {
      let token = null
      try { token = await getToken() } catch (e) { console.warn('getToken failed:', e) }
      const authHeaders = token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' }

      let response = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: authHeaders as HeadersInit
      })

      if (!response.ok) {
        const defaultResponse = await fetch('/api/settings/default', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (defaultResponse.ok) {
          const defaultSettings = await defaultResponse.json()
          response = await fetch('/api/settings', {
            method: 'PUT',
            headers: authHeaders as HeadersInit,
            body: JSON.stringify(defaultSettings)
          })
        }
      }

      if (response.ok) {
        const defaultSettings = await response.json()
        setSettings(defaultSettings)
        setInitialSettings(defaultSettings)
        setHasChanges(false)
        setWasReset(true)
        toast.success('Settings reset to defaults')
      } else {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
    } catch (error) {
      console.error('Failed to reset settings:', error)
      toast.error(`Failed to reset settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Save settings
  const saveSettings = async () => {
    setSaving(true)
    try {
      let token = null
      try { token = await getToken() } catch (e) { console.warn('getToken failed:', e) }
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        const updatedSettings = await response.json()
        setSettings(updatedSettings)
        const valuesChanged = initialSettings ? JSON.stringify(initialSettings) !== JSON.stringify(updatedSettings) : false
        setHasChanges(valuesChanged)
        toast.success('Settings saved successfully')
      } else {
        const error = await response.text()
        toast.error(`Failed to save settings: ${error}`)
      }
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || 'Unknown error'
      toast.error(`Failed to save settings: ${errorMsg}`)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setWasReset(false)
    const valuesChanged = initialSettings ? JSON.stringify({ ...settings, [key]: value }) !== JSON.stringify(initialSettings) : true
    setHasChanges(valuesChanged)
  }

  const updateSignalWeight = (signal: keyof Settings['signal_weights'], value: number) => {
    setSettings(prev => ({
      ...prev,
      signal_weights: {
        ...prev.signal_weights,
        [signal]: value
      }
    }))
    setWasReset(false)
    const updatedSettings = {
      ...settings,
      signal_weights: {
        ...settings.signal_weights,
        [signal]: value
      }
    }
    const valuesChanged = initialSettings ? JSON.stringify(updatedSettings) !== JSON.stringify(initialSettings) : true
    setHasChanges(valuesChanged)
  }

  const sectionHeaderClass = "text-lg font-semibold text-foreground mb-4"

  const isDefault = useMemo(() => {
    return JSON.stringify(settings) === JSON.stringify(DEFAULT_SETTINGS)
  }, [settings])

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-8 p-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Settings
              </h1>
              {loading && <Badge variant="outline" className="text-muted-foreground">Loading</Badge>}
              {isDefault && !loading && <Badge className="badge-premium">Default</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              Configure SentinelAI risk assessment behavior
              {settings.updated_at && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (Last updated: {new Date(settings.updated_at).toLocaleDateString()})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              disabled={saving || !hasChanges || wasReset || isDefault}
              className="btn-premium-outline"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={saveSettings}
              disabled={saving || !hasChanges}
              className="btn-premium"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </motion.div>

        {/* Settings Sections */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          {/* Risk Thresholds */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card className="card-premium border-border">
              <CardHeader>
                <CardTitle className={sectionHeaderClass}>Risk Thresholds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="warn-threshold" className="text-foreground">Warning Threshold</Label>
                    <span className="rounded bg-muted px-2 py-1 font-mono text-sm text-foreground tabular-nums">
                      {settings.warn_threshold.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    id="warn-threshold"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[settings.warn_threshold]}
                    onValueChange={([value]) => updateSetting('warn_threshold', value)}
                  />
                  <p className="text-xs text-muted-foreground">Risk score at which warnings are triggered</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="escalate-threshold" className="text-foreground">Escalation Threshold</Label>
                    <span className="rounded bg-muted px-2 py-1 font-mono text-sm text-foreground tabular-nums">
                      {settings.escalate_threshold.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    id="escalate-threshold"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[settings.escalate_threshold]}
                    onValueChange={([value]) => updateSetting('escalate_threshold', value)}
                  />
                  <p className="text-xs text-muted-foreground">Risk score at which escalation is triggered</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="confidence-floor" className="text-foreground">Confidence Floor</Label>
                    <span className="rounded bg-muted px-2 py-1 font-mono text-sm text-foreground tabular-nums">
                      {settings.confidence_floor.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    id="confidence-floor"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[settings.confidence_floor]}
                    onValueChange={([value]) => updateSetting('confidence_floor', value)}
                  />
                  <p className="text-xs text-muted-foreground">Minimum confidence required for risk assessment</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Signal Sensitivity */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
            <Card className="card-premium border-border">
              <CardHeader>
                <CardTitle className={sectionHeaderClass}>Signal Sensitivity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prompt-anomaly" className="text-foreground">Prompt Anomaly</Label>
                    <span className="rounded bg-muted px-2 py-1 font-mono text-sm text-foreground tabular-nums">
                      {settings.signal_weights.prompt_anomaly.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    id="prompt-anomaly"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[settings.signal_weights.prompt_anomaly]}
                    onValueChange={([value]) => updateSignalWeight('prompt_anomaly', value)}
                  />
                  <p className="text-xs text-muted-foreground">Weight for detecting unusual prompt patterns</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="jailbreak-attempt" className="text-foreground">Jailbreak Attempt</Label>
                    <span className="rounded bg-muted px-2 py-1 font-mono text-sm text-foreground tabular-nums">
                      {settings.signal_weights.jailbreak_attempt.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    id="jailbreak-attempt"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[settings.signal_weights.jailbreak_attempt]}
                    onValueChange={([value]) => updateSignalWeight('jailbreak_attempt', value)}
                  />
                  <p className="text-xs text-muted-foreground">Weight for detecting jailbreak attempts</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="unsafe-output" className="text-foreground">Unsafe Output</Label>
                    <span className="rounded bg-muted px-2 py-1 font-mono text-sm text-foreground tabular-nums">
                      {settings.signal_weights.unsafe_output.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    id="unsafe-output"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[settings.signal_weights.unsafe_output]}
                    onValueChange={([value]) => updateSignalWeight('unsafe_output', value)}
                  />
                  <p className="text-xs text-muted-foreground">Weight for detecting unsafe output patterns</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Enforcement Mode */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Card className="card-premium border-border">
              <CardHeader>
                <CardTitle className={sectionHeaderClass}>Enforcement Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="enforcement-mode" className="text-foreground">Default Action</Label>
                  <Select value={settings.enforcement_mode} onValueChange={(value) => updateSetting('enforcement_mode', value as 'allow' | 'warn' | 'escalate')}>
                    <SelectTrigger aria-label="Enforcement mode">
                      <SelectValue placeholder="Select enforcement mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                          Allow - Pass through all requests
                        </div>
                      </SelectItem>
                      <SelectItem value="warn">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
                          Warn - Log warnings but allow
                        </div>
                      </SelectItem>
                      <SelectItem value="escalate">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-red-500"></span>
                          Escalate - Block high-risk requests
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Default action when thresholds are exceeded</p>
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="pii-redaction" className="text-foreground">PII Redaction</Label>
                    <p className="text-xs text-muted-foreground">
                      Detect and redact PII in analyzed prompts and responses
                    </p>
                  </div>
                  <Switch
                    id="pii-redaction"
                    checked={settings.pii_redaction_enabled}
                    onCheckedChange={(checked) => updateSetting('pii_redaction_enabled', checked)}
                    aria-label="Toggle PII redaction"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Detection Performance (FP tuning cockpit) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <Card className="card-premium border-border">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Detection Performance
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Real outcomes from review queue dispositions — false positives are excluded
                    from the training loop automatically.
                  </p>
                </div>
                {metrics && metrics.pending_review > 0 && (
                  <Link href="/user/review-queue" className="shrink-0">
                    <Button variant="destructive" size="sm" className="btn-premium-outline">
                      <ShieldAlert className="mr-1.5 h-4 w-4" />
                      {metrics.pending_review} pending review
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {cockpitLoading ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : !metrics && !feedbackStats ? (
                <p className="text-sm text-muted-foreground">
                  No detection data available yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {metrics && (
                    <>
                      <div className="rounded-lg border border-border bg-card p-4">
                        <div className="text-xs text-muted-foreground">Detection Rate</div>
                        <div className="mt-1 text-2xl font-bold text-foreground tabular-nums">
                          {(metrics.detection_rate * 100).toFixed(0)}%
                        </div>
                        <p className="text-xs text-muted-foreground">High-risk flagged in last 24h</p>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-4">
                        <div className="text-xs text-muted-foreground">False Positive Rate</div>
                        <div className={`mt-1 text-2xl font-bold tabular-nums ${
                          metrics.false_positive_rate < 0.1 ? 'text-emerald-500' :
                          metrics.false_positive_rate < 0.3 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {(metrics.false_positive_rate * 100).toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">From reviewed dispositions</p>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-4">
                        <div className="text-xs text-muted-foreground">False Negative Rate</div>
                        <div className={`mt-1 text-2xl font-bold tabular-nums ${
                          metrics.false_negative_rate < 0.1 ? 'text-emerald-500' :
                          metrics.false_negative_rate < 0.3 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {(metrics.false_negative_rate * 100).toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Missed threats confirmed by review</p>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-4">
                        <div className="text-xs text-muted-foreground">Avg Detection Time</div>
                        <div className="mt-1 text-2xl font-bold text-foreground tabular-nums">
                          {metrics.avg_detection_time_ms.toFixed(1)}ms
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {metrics.new_patterns_last_24h} new patterns in 24h
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {feedbackStats && feedbackStats.total_feedback > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground mr-1">Dispositions:</span>
                  {['confirmed_threat', 'false_positive', 'compliance_issue'].map((cat) => (
                    <Badge
                      key={cat}
                      variant={cat === 'false_positive' ? 'warning' : cat === 'confirmed_threat' ? 'destructive' : 'secondary'}
                      className="capitalize"
                    >
                      {cat.replace('_', ' ')}: {feedbackStats.by_category?.[cat] ?? 0}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {feedbackStats.reviewed} reviewed · {feedbackStats.used_for_training} used for training
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Version footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between px-1"
        >
          <div className="flex items-center gap-2 text-sm">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">v{settings.version}</span>
            {hasChanges && <Badge variant="secondary" className="text-xs">Unsaved</Badge>}
            {wasReset && <Badge className="badge-premium text-xs">Reset to defaults</Badge>}
          </div>
        </motion.div>

        {/* Settings History */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="card-premium border-border">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    Settings history
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Versioned audit trail of settings updates</p>
                </div>
                <div className="flex items-center gap-2">
                  {historyLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                    disabled={historyPage <= 1 || historyLoading}
                    className="btn-premium-outline"
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">Page {historyPage}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage(historyPage + 1)}
                    disabled={history.length < 10 || historyLoading}
                    className="btn-premium-outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {historyLoading && history.length === 0 ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <History className="h-6 w-6 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No history available yet</p>
                  </div>
                ) : (
                  history.slice(0, 10).map((h) => (
                    <div
                      key={h.id}
                      className="rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            v{h.version}
                          </span>
                          {h.updated_by && (
                            <span className="text-xs text-muted-foreground">{h.updated_by}</span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {h.created_at ? new Date(h.created_at).toLocaleString() : '—'}
                        </div>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap font-mono text-xs text-foreground/90">
                        {h.thresholds_applied ? JSON.stringify(h.thresholds_applied, null, 2) : '—'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
