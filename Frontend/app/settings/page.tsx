"use client"

import { useEffect, useState } from 'react'
import { AppLayoutModern } from '../components/layout/AppLayoutModern'
import { Button, Switch, Separator, Input, Label } from '@/components/ui'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion } from 'framer-motion'
import { useCursorInteractions } from '@/hooks/useCursorInteractions'
import { 
  MotionCard,
  staggerContainer,
  slideUp,
  hoverScaleLift,
  hoverGlow,
  buttonPress
} from '@/components/ui/motion'
import { toast } from 'sonner'
import Swal from 'sweetalert2'
import { UserGuard } from '@/components/guards/user-org-guards'

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
  version: 1
}

export function SettingsPageContent() {
  const { registerInteractiveElement } = useCursorInteractions()
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

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
          setInitialSettings(data) // Store initial loaded settings
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
        const response = await fetch(`/api/settings/history?limit=10&page=${historyPage}`, { cache: 'no-store' })
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

  // Reset to defaults
  const resetToDefaults = async () => {
    const result = await Swal.fire({
      title: 'Reset to Defaults?',
      text: 'Are you sure you want to reset all settings to their default values? This will overwrite your current configuration and save to database.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, reset!',
      cancelButtonText: 'Cancel'
    })
    
    if (!result.isConfirmed) {
      return
    }
    
    try {
      console.log('Attempting to reset settings...')
      
      // Try POST reset endpoint first
      let response = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      console.log('Reset response status:', response.status)
      
      if (!response.ok) {
        console.log('POST reset failed, trying fallback method...')
        // Fallback: get defaults and save them
        const defaultResponse = await fetch('/api/settings/default')
        if (defaultResponse.ok) {
          const defaultSettings = await defaultResponse.json()
          console.log('Got default settings:', defaultSettings)
          
          // Save the defaults
          response = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(defaultSettings)
          })
          console.log('Save defaults response status:', response.status)
        }
      }
      
      if (response.ok) {
        const defaultSettings = await response.json()
        console.log('Reset settings received:', defaultSettings)
        
        // Check if values actually changed from initial loaded settings
        const valuesChanged = initialSettings ? JSON.stringify(initialSettings) !== JSON.stringify(defaultSettings) : true
        setSettings(defaultSettings)
        setInitialSettings(defaultSettings) // Update initial settings
        setHasChanges(false) // Always set to false after successful reset
        setWasReset(true) // Mark that reset was performed
        toast.success('Settings reset to defaults')
        
        await Swal.fire({
          title: 'Reset Complete!',
          text: 'Settings have been reset to default values and saved to database.',
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        })
      } else {
        const errorText = await response.text()
        console.error('Reset failed with status:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
    } catch (error) {
      console.error('Failed to reset settings:', error)
      toast.error('Failed to reset settings')
      
      await Swal.fire({
        title: 'Error!',
        text: `Failed to reset settings: ${error.message}`,
        icon: 'error',
        confirmButtonText: 'OK'
      })
    }
  }

  // Save settings
  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        const updatedSettings = await response.json()
        setSettings(updatedSettings)
        
        // Check if values actually changed from initial loaded settings
        const valuesChanged = initialSettings ? JSON.stringify(initialSettings) !== JSON.stringify(updatedSettings) : false
        setHasChanges(valuesChanged)
        toast.success('Settings saved successfully')
        
        await Swal.fire({
          title: 'Settings Saved!',
          text: 'Your configuration has been updated and saved to the database.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        const error = await response.text()
        toast.error(`Failed to save settings: ${error}`)
        
        await Swal.fire({
          title: 'Save Failed!',
          text: `Failed to save settings: ${error}`,
          icon: 'error',
          confirmButtonText: 'OK'
        })
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
      
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to save settings. Please check your connection and try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      })
    } finally {
      setSaving(false)
    }
  }

  // Update settings and track changes
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setWasReset(false) // Reset wasReset flag when user makes changes
    
    // Check if values actually changed from initial loaded settings
    const valuesChanged = initialSettings ? JSON.stringify({ ...settings, [key]: value }) !== JSON.stringify(initialSettings) : true
    setHasChanges(valuesChanged)
  }

  const updateSignalWeight = (signal: keyof Settings['signal_weights'], value: number) => {
    setSettings(prev => {
      const updatedSettings = {
        ...prev,
        signal_weights: {
          ...prev.signal_weights,
          [signal]: value
        }
      }
      return updatedSettings
    })
    setWasReset(false) // Reset wasReset flag when user makes changes
    
    // Check if values actually changed from initial loaded settings
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

  return (
    <div className="min-h-screen bg-gradient-navy">
        {/* Premium animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>
        
        <div className="relative z-10 space-y-8 p-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-2"
          >
            <motion.h1 variants={slideUp} className="text-3xl font-bold tracking-tight text-foreground">
              Settings
              {loading && <span className="ml-2 text-sm text-muted">(Loading...)</span>}
            </motion.h1>
            <motion.p variants={slideUp} className="text-muted">
              Configure SentinelAI risk assessment behavior
              {settings.updated_at && (
                <span className="ml-2 text-xs text-muted">
                  (Last updated: {new Date(settings.updated_at).toLocaleDateString()})
                </span>
              )}
            </motion.p>
          </motion.div>

          {/* Settings Sections */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Risk Thresholds */}
            <MotionCard variants={slideUp} className="card-premium p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Risk Thresholds</h2>
              <div className="space-y-6">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="warn-threshold" className="text-foreground">Warning Threshold</Label>
                    <span className="text-sm font-mono bg-navy-800 px-2 py-1 rounded">
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
                    className="w-full"
                  />
                  <p className="text-xs text-muted">Risk score at which warnings are triggered</p>
                </motion.div>
                
                <Separator className="bg-white/10" />
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="escalate-threshold" className="text-foreground">Escalation Threshold</Label>
                    <span className="text-sm font-mono bg-navy-800 px-2 py-1 rounded">
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
                    className="w-full"
                  />
                  <p className="text-xs text-muted">Risk score at which escalation is triggered</p>
                </motion.div>
                
                <Separator className="bg-white/10" />
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="confidence-floor" className="text-foreground">Confidence Floor</Label>
                    <span className="text-sm font-mono bg-navy-800 px-2 py-1 rounded">
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
                    className="w-full"
                  />
                  <p className="text-xs text-muted">Minimum confidence required for risk assessment</p>
                </motion.div>
              </div>
            </MotionCard>

            {/* Signal Sensitivity */}
            <MotionCard variants={slideUp} className="card-premium p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Signal Sensitivity</h2>
              <div className="space-y-6">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prompt-anomaly" className="text-foreground">Prompt Anomaly</Label>
                    <span className="text-sm font-mono bg-navy-800 px-2 py-1 rounded">
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
                    className="w-full"
                  />
                  <p className="text-xs text-muted">Weight for detecting unusual prompt patterns</p>
                </motion.div>
                
                <Separator className="bg-white/10" />
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="jailbreak-attempt" className="text-foreground">Jailbreak Attempt</Label>
                    <span className="text-sm font-mono bg-navy-800 px-2 py-1 rounded">
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
                    className="w-full"
                  />
                  <p className="text-xs text-muted">Weight for detecting jailbreak attempts</p>
                </motion.div>
                
                <Separator className="bg-white/10" />
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="unsafe-output" className="text-foreground">Unsafe Output</Label>
                    <span className="text-sm font-mono bg-navy-800 px-2 py-1 rounded">
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
                    className="w-full"
                  />
                  <p className="text-xs text-muted">Weight for detecting unsafe output patterns</p>
                </motion.div>
              </div>
            </MotionCard>

            {/* Enforcement Mode */}
            <MotionCard variants={slideUp} className="card-premium p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Enforcement Mode</h2>
              <div className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="space-y-3"
                >
                  <Label htmlFor="enforcement-mode" className="text-foreground">Default Action</Label>
                  <Select value={settings.enforcement_mode} onValueChange={(value) => updateSetting('enforcement_mode', value as 'allow' | 'warn' | 'escalate')}>
                    <SelectTrigger className="input-premium">
                      <SelectValue placeholder="Select enforcement mode" />
                    </SelectTrigger>
                    <SelectContent className="card-premium border-white/10">
                      <SelectItem value="allow">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Allow - Pass through all requests
                        </div>
                      </SelectItem>
                      <SelectItem value="warn">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                          Warn - Log warnings but allow
                        </div>
                      </SelectItem>
                      <SelectItem value="escalate">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          Escalate - Block high-risk requests
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted">Default action when thresholds are exceeded</p>
                </motion.div>
              </div>
            </MotionCard>

          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex justify-between items-center pt-6"
          >
            <div className="text-sm text-muted">
              Version {settings.version} 
              {hasChanges && <span className="ml-2 text-yellow-400">(Unsaved changes)</span>}
            </div>
            <div className="flex space-x-4">
              <motion.div {...buttonPress}>
                <Button 
                  variant="outline" 
                  className="btn-premium-outline"
                  onClick={resetToDefaults}
                  disabled={saving || !hasChanges || wasReset}
                >
                  Reset to Defaults
                </Button>
              </motion.div>
              <motion.div {...buttonPress}>
                <Button 
                  className="btn-premium"
                  onClick={saveSettings}
                  disabled={saving || !hasChanges}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="pt-6"
          >
            <MotionCard variants={slideUp} className="card-premium p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Settings history</h2>
                  <p className="text-xs text-muted">Versioned audit trail of settings updates</p>
                </div>
                <div className="flex items-center gap-2">
                  {historyLoading && <span className="text-xs text-muted">Loading…</span>}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                    disabled={historyPage <= 1 || historyLoading}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted">Page {historyPage}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setHistoryPage(historyPage + 1)}
                    disabled={history.length < 10 || historyLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>

              <div className="mt-4 max-h-96 overflow-y-auto space-y-2">
                {history.length === 0 ? (
                  <div className="text-sm text-muted">No history available</div>
                ) : (
                  history.slice(0, 10).map((h) => (
                    <div
                      key={h.id}
                      className="rounded-xl border border-white/10 bg-black/20 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium text-foreground">
                          v{h.version}
                          {h.updated_by ? <span className="ml-2 text-xs text-muted">by {h.updated_by}</span> : null}
                        </div>
                        <div className="text-xs font-mono text-muted">
                          {h.created_at ? new Date(h.created_at).toLocaleString() : '—'}
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-mono text-foreground/90 whitespace-pre-wrap">
                        {h.thresholds_applied ? JSON.stringify(h.thresholds_applied, null, 2) : '—'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </MotionCard>
          </motion.div>
        </div>
    </div>
  )
}

export default function SettingsPageModern() {
  return (
    <UserGuard>
      <AppLayoutModern>
        <SettingsPageContent />
      </AppLayoutModern>
    </UserGuard>
  )
}
