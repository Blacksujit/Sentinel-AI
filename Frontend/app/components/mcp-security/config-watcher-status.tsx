'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FolderSearch, Plus, X, RefreshCw, Eye, EyeOff, Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useConfigWatcherStatus,
  useAddWatchPath,
  useRemoveWatchPath,
} from '@/hooks/mcp-security/use-mcp-security'

export function ConfigWatcherStatus() {
  const [newPath, setNewPath] = useState('')

  const { data, isLoading, refetch } = useConfigWatcherStatus()
  const addPath = useAddWatchPath()
  const removePath = useRemoveWatchPath()

  const handleAdd = async () => {
    if (!newPath.trim()) return
    await addPath.mutateAsync(newPath.trim())
    setNewPath('')
  }

  return (
    <Card className="border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FolderSearch className="h-4 w-4" />
          Config Watcher
        </CardTitle>
        <div className="flex items-center gap-2">
          {data && (
            <Badge className={`text-[10px] px-1.5 py-0 border ${
              data.is_watching
                ? 'bg-[color:var(--signal-bg)] text-[color:var(--signal)] border-[color:var(--signal-soft)]'
                : 'bg-muted text-muted-foreground border-border'
            }`}>
              {data.is_watching ? 'Watching' : 'Paused'}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && !data ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Status Info */}
            {data && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {data.watched_paths.length} path{data.watched_paths.length !== 1 ? 's' : ''} watched
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Poll: {data.poll_interval}s
                </span>
                {data.last_check && (
                  <span>Last check: {new Date(data.last_check).toLocaleTimeString()}</span>
                )}
              </div>
            )}

            {/* Watched Paths */}
            <div className="space-y-1">
              {(data?.watched_paths || []).map(path => (
                <motion.div
                  key={path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/20 group"
                >
                  <FolderSearch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-mono flex-1 truncate">{path}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePath.mutateAsync(path)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={removePath.isPending}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </motion.div>
              ))}
            </div>

            {/* Add Path */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="Path to watch (e.g. ~/.config/claude/mcp.json)"
                className="flex-1 rounded-md border bg-input px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAdd}
                disabled={!newPath.trim() || addPath.isPending}
                className="h-9 shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
