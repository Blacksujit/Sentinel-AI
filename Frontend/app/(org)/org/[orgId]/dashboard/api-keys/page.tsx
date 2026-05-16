'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Key,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { apiGet, apiPost } from '@/lib/api-client'
import { useAuth } from '@clerk/nextjs'

interface ApiKey {
  id: number
  name: string
  prefix: string
  status: 'active' | 'revoked'
  created_at: string | null
  last_used_at: string | null
  usage_count_24h: number
  usage_count_30d: number
}

export default function ApiKeysPage() {
  const params = useParams()
  const { getToken } = useAuth()
  const orgId = params?.orgId as string
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [showKeyDialog, setShowKeyDialog] = useState(false)
  const [revokingKeyId, setRevokingKeyId] = useState<number | null>(null)
  const [rotatingKeyId, setRotatingKeyId] = useState<number | null>(null)
  const [hasCopiedKey, setHasCopiedKey] = useState(false)

  useEffect(() => {
    async function fetchApiKeys() {
      try {
        const token = await getToken()
        const data = await apiGet(`/api/orgs/${orgId}/api-keys`, token)
        setApiKeys(data)
      } catch (error) {
        console.error('Failed to fetch API keys:', error)
        toast.error('Failed to load API keys')
      } finally {
        setIsLoading(false)
      }
    }

    if (orgId) {
      fetchApiKeys()
    }
  }, [orgId, getToken])

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name')
      return
    }

    try {
      const token = await getToken()
      const response = await apiPost(`/api/orgs/${orgId}/api-keys`, {
        name: newKeyName
      }, token)
      
      setCreatedKey(response.api_key)
      setShowCreateDialog(false)
      setShowKeyDialog(true)
      setNewKeyName('')
      
      // Refresh the list
      const data = await apiGet(`/api/orgs/${orgId}/api-keys`, token)
      setApiKeys(data)
      
      toast.success('API key created successfully')
    } catch (error) {
      console.error('Failed to create API key:', error)
      toast.error('Failed to create API key')
    }
  }

  const handleRotateKey = async (keyId: number) => {
    try {
      setRotatingKeyId(keyId)
      const token = await getToken()
      const response = await apiPost(`/api/orgs/${orgId}/api-keys/${keyId}/rotate`, {}, token)

      setCreatedKey(response.api_key)
      setShowKeyDialog(true)

      const data = await apiGet(`/api/orgs/${orgId}/api-keys`, token)
      setApiKeys(data)

      toast.success('API key rotated')
    } catch (error) {
      console.error('Failed to rotate API key:', error)
      toast.error('Failed to rotate API key')
    } finally {
      setRotatingKeyId(null)
    }
  }

  const handleRevokeKey = async (keyId: number) => {
    try {
      const token = await getToken()
      await apiPost(`/api/orgs/${orgId}/api-keys/${keyId}/revoke`, {}, token)
      
      // Refresh the list
      const data = await apiGet(`/api/orgs/${orgId}/api-keys`, token)
      setApiKeys(data)
      
      setRevokingKeyId(null)
      toast.success('API key revoked')
    } catch (error) {
      console.error('Failed to revoke API key:', error)
      toast.error('Failed to revoke API key')
    }
  }

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        ;(navigator as any).vibrate(25)
      }
    } catch {
      // ignore
    }
    setHasCopiedKey(true)
    window.setTimeout(() => setHasCopiedKey(false), 1200)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted mt-1">
            Manage API keys for accessing SentinelAI services
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-indigo-500 to-purple-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Key
        </Button>
      </motion.div>

      {/* Warning Card */}
      <Card className="border-amber-500/30 bg-amber-500/10">
        <CardContent className="flex items-start gap-4 py-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-400">Security Notice</h4>
            <p className="text-sm text-amber-200/80 mt-1">
              API keys provide full access to your organization data. Store them securely and never share them publicly. 
              Keys are only shown once at creation time.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Table */}
      <Card className="card-premium border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Your API Keys</CardTitle>
          <CardDescription>
            {apiKeys.filter((k) => k.status === 'active').length} active key{apiKeys.filter((k) => k.status === 'active').length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No API keys yet</h3>
              <p className="text-muted mt-1">
                Create your first API key to start using SentinelAI services
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">{key.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        key.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {key.status}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-muted">
                      {key.prefix}••••••••••••
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      {key.created_at ? (
                        <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                      ) : null}
                      <span>{key.usage_count_30d} uses (30d)</span>
                      {key.last_used_at && (
                        <span>Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {key.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRotateKey(key.id)}
                        disabled={rotatingKeyId === key.id}
                        className="border-white/20 text-foreground hover:bg-white/10"
                      >
                        <RefreshCw className={`w-4 h-4 ${rotatingKeyId === key.id ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                    {key.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRevokingKeyId(key.id)}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Enter a name to identify this API key
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="Production API"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateKey}
              className="bg-gradient-to-r from-indigo-500 to-purple-500"
            >
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show New Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Copy Your API Key
            </DialogTitle>
            <DialogDescription className="text-amber-200/80">
              This key will only be shown once. Store it securely now.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <code className="text-sm font-mono text-amber-100 break-all">
                {createdKey}
              </code>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => copyToClipboard(createdKey || '')}
              className="flex-1"
              disabled={!createdKey}
            >
              <Copy className="w-4 h-4 mr-2" />
              {hasCopiedKey ? 'Copied' : 'Copy to Clipboard'}
            </Button>
            <Button
              onClick={() => {
                setShowKeyDialog(false)
                setCreatedKey(null)
                setHasCopiedKey(false)
              }}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500"
            >
              I&apos;ve Saved It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!revokingKeyId} onOpenChange={() => setRevokingKeyId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this API key? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setRevokingKeyId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => revokingKeyId && handleRevokeKey(revokingKeyId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
