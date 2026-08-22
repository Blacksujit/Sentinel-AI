'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Send, Shield, ShieldAlert, Lightbulb, Trophy, Share2,
  Lock, Check, ChevronRight, Loader2,
} from 'lucide-react'

type Level = {
  id: number
  name: string
  emoji: string
  guards: string[]
  hint: string
  flavor: string
}

type AttackResult = {
  outcome: 'win' | 'refused' | 'talk'
  level_id: number
  secret?: string
  reason?: string
  message: string
  hint?: string
  next_level?: string
}

type Turn = {
  role: 'user' | 'sentinel'
  text: string
  kind?: 'refused' | 'win'
}

type ScoreRow = {
  rank: number
  player_name: string
  levels_completed: number
  attempts: number
  created_at: string
}

const STORAGE_KEY = 'sentinel_hack_progress'

export default function HackPage() {
  const [levels, setLevels] = useState<Level[]>([])
  const [completed, setCompleted] = useState<number[]>([])
  const [current, setCurrent] = useState(0)
  const [turns, setTurns] = useState<Turn[]>([])
  const [message, setMessage] = useState('')
  const [hintOpen, setHintOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [leaderboard, setLeaderboard] = useState<ScoreRow[]>([])
  const [playerName, setPlayerName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [levelsRes, scoresRes] = await Promise.all([
          fetch('/api/game/levels', { cache: 'no-store' }),
          fetch('/api/game/scores', { cache: 'no-store' }),
        ])
        if (!cancelled) {
          if (levelsRes.ok) {
            const data = await levelsRes.json()
            setLevels(data.levels || [])
          }
          if (scoresRes.ok) {
            const data = await scoresRes.json()
            setLeaderboard(data.scores || data.leaderboard || [])
          }
        }
      } catch {
        // backend offline; game will surface errors on attack
      }
      if (!cancelled) {
        try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          const done = Array.isArray(saved.completed) ? saved.completed : []
          setCompleted(done)
          setAttempts(saved.attempts || 0)
          setCurrent(Math.min(done.length, 9))
          setTurns([{
            role: 'sentinel',
            text:
              'I am the Sentinel. I guard secrets against prompt injection. Ask me anything \u2014 but I will only reveal what my guardrails allow. Each level holds one secret.',
          }])
        } catch {
          // no saved progress
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed, attempts }))
    } catch {
      // storage unavailable
    }
  }, [completed, attempts])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, error])

  const level = levels[current]

  const unlocked = (id: number) => {
    const idx = id - 1
    return id === 1 || completed.includes(id) || idx <= current
  }

  const attack = async () => {
    const text = message.trim()
    if (!text || busy || !level) return
    setBusy(true)
    setError('')
    setHintOpen(false)
    setTurns((t) => [...t, { role: 'user', text }])
    setMessage('')
    setAttempts((a) => a + 1)
    try {
      const res = await fetch('/api/game/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level_id: level.id, message: text }),
        cache: 'no-store',
      })
      if (res.status === 429) {
        setTurns((t) => [...t, { role: 'sentinel', text: 'Slow down, human. The Sentinel needs a moment to think.', kind: 'refused' }])
        return
      }
      const data: AttackResult = await res.json()
      if (data.outcome === 'win') {
        setTurns((t) => [...t, { role: 'sentinel', text: data.message, kind: 'win' }])
        setCompleted((prev) => (prev.includes(level.id) ? prev : [...prev, level.id]))
        if (level.id === 10) {
          setTurns((t) => [...t, { role: 'sentinel', text: 'All ten secrets extracted. The Sentinel stands defeated \u2014 and your name belongs on the board.', kind: 'win' }])
        }
      } else if (data.outcome === 'talk') {
        setTurns((t) => [...t, { role: 'sentinel', text: data.message }])
      } else {
        setTurns((t) => [...t, { role: 'sentinel', text: data.message, kind: 'refused' }])
      }
    } catch {
      setError('Could not reach the Sentinel. Is the backend running?')
    } finally {
      setBusy(false)
    }
  }

  const submitScore = async () => {
    const name = playerName.trim()
    if (!name) return
    setBusy(true)
    try {
      const res = await fetch('/api/game/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: name, levels_completed: 10, attempts }),
        cache: 'no-store',
      })
      if (res.ok) {
        setSubmitted(true)
        const scoresRes = await fetch('/api/game/scores', { cache: 'no-store' })
        if (scoresRes.ok) {
          const data = await scoresRes.json()
          setLeaderboard(data.scores || data.leaderboard || [])
        }
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || 'Could not submit score.')
      }
    } catch {
      setError('Could not submit score. Is the backend running?')
    } finally {
      setBusy(false)
    }
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Hack the Sentinel', url })
        return
      }
      throw new Error('no-share')
    } catch {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // clipboard unavailable
      }
    }
  }

  const done = completed.length >= 10

  return (
    <div className="min-h-screen bg-[color:var(--paper)] text-[color:var(--ink)]">
      <div className="mx-auto max-w-3xl px-4 py-14 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--paper-raised)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-soft)] shadow-sm mb-4">
            <Shield className="h-3.5 w-3.5 text-[color:var(--red)]" />
            Prompt injection game
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-[color:var(--ink)] mb-4">
            Hack the <em className="text-[color:var(--red)] not-italic">Sentinel</em>
          </h1>
          <p className="text-[color:var(--ink-soft)] max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            SentinelAI&apos;s guardrail stack defends LLM apps against prompt injection.
            This game uses the same detectors as our production API. Extract all{' '}
            <strong className="text-[color:var(--ink)]">10 secrets</strong> and put your
            name on the board.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={share} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--paper-raised)] px-4 py-2 text-sm font-semibold text-[color:var(--ink-soft)] transition hover:border-[color:var(--red)] hover:text-[color:var(--red)]">
              <Share2 className="h-4 w-4" />
              {copied ? 'Link copied' : 'Challenge a friend'}
            </button>
            <Link href="/start" className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--paper-raised)] px-4 py-2 text-sm font-semibold text-[color:var(--ink-soft)] transition hover:border-[color:var(--red)] hover:text-[color:var(--red)]">
              See how it works <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>

        {/* Level strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mb-6 grid grid-cols-5 gap-2 md:grid-cols-10"
        >
          {levels.map((lv) => {
            const isDone = completed.includes(lv.id)
            const isCurrent = lv.id === current + 1
            const isOpen = unlocked(lv.id)
            return (
              <button
                key={lv.id}
                disabled={!isOpen}
                onClick={() => {
                  setCurrent(lv.id - 1)
                  setTurns([
                    {
                      role: 'sentinel',
                      text:
                        lv.id === 1
                          ? 'I am the Sentinel. Ask me anything \u2014 but I will only reveal what my guardrails allow.'
                          : `Level ${lv.id}: ${lv.flavor}`,
                    },
                  ])
                  setHintOpen(false)
                  setError('')
                }}
                className={`relative flex flex-col items-center gap-1 rounded-xl border py-2.5 text-sm transition ${
                  isCurrent
                    ? 'border-[color:var(--red)] bg-[color:var(--red-bg)] shadow-[0_2px_10px_rgba(168,52,38,0.15)]'
                    : isDone
                      ? 'border-[color:var(--green-soft)] bg-[color:var(--green-bg)]'
                      : isOpen
                        ? 'border-[color:var(--line)] bg-[color:var(--paper-raised)] hover:border-[color:var(--line-strong)]'
                        : 'border-[color:var(--line)] bg-[color:var(--paper-sunken)] opacity-45'
                }`}
                title={`Level ${lv.id}: ${lv.name}`}
              >
                <span className="text-base leading-none">{isDone ? '✓' : isOpen ? lv.emoji : <Lock className="h-3.5 w-3.5 text-[color:var(--ink-soft)]" />}</span>
                <span className="text-[10px] font-semibold text-[color:var(--ink-soft)]">{lv.id}</span>
              </button>
            )
          })}
        </motion.div>

        {/* Active level header */}
        {level && (
          <motion.div
            key={level.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 flex items-center justify-between rounded-xl border border-[color:var(--line)] bg-[color:var(--paper-raised)] px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{level.emoji}</span>
              <div>
                <div className="text-sm font-semibold text-[color:var(--ink)]">
                  Level {level.id}: {level.name}
                </div>
                <div className="text-xs text-[color:var(--ink-soft)]">
                  Guards: {level.guards.map((g) => g.replace('_', ' ')).join(' \u00b7 ')}
                </div>
              </div>
            </div>
            <span className="hidden rounded-full border border-[color:var(--line)] bg-[color:var(--paper)] px-2.5 py-1 font-mono text-[10px] text-[color:var(--ink-soft)] sm:inline">
              attempts: {attempts}
            </span>
          </motion.div>
        )}

        {/* Chat area */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="mb-4 flex h-[380px] flex-col rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper-raised)] shadow-sm"
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {turns.map((turn, i) => (
              <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    turn.role === 'user'
                      ? 'rounded-br-sm bg-[color:var(--ink)] text-[color:var(--paper)]'
                      : turn.kind === 'win'
                        ? 'rounded-bl-sm border border-[color:var(--green-soft)] bg-[color:var(--green-bg)] text-[color:var(--ink)]'
                        : 'rounded-bl-sm border border-[color:var(--line)] bg-[color:var(--paper)] text-[color:var(--ink)]'
                  }`}
                >
                  {turn.role === 'sentinel' && turn.kind === 'win' && (
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[color:var(--green)]">
                      <Shield className="h-3.5 w-3.5" /> secret revealed
                    </div>
                  )}
                  {turn.role === 'sentinel' && turn.kind === 'refused' && (
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[color:var(--red)]">
                      <ShieldAlert className="h-3.5 w-3.5" /> guard tripped
                    </div>
                  )}
                  {turn.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-[color:var(--line)] bg-[color:var(--paper)] px-4 py-3 text-sm text-[color:var(--ink-soft)]">
                  <Loader2 className="h-4 w-4 animate-spin" /> The Sentinel is thinking&hellip;
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-[color:var(--red-soft)] bg-[color:var(--red-bg)] px-4 py-2.5 text-sm text-[color:var(--red)]">
                {error}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-[color:var(--line)] p-4">
            <div className="flex items-center gap-3">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && attack()}
                placeholder={`Attack level ${level?.id ?? ''}: ask the Sentinel for the secret\u2026`}
                disabled={busy || done}
                className="flex-1 rounded-xl border border-[color:var(--line)] bg-[color:var(--paper)] px-4 py-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] shadow-sm transition focus:border-[color:var(--red)] focus:outline-none focus:ring-2 focus:ring-[color:var(--red)]/20 disabled:opacity-50"
              />
              <button
                onClick={attack}
                disabled={busy || done || !message.trim()}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--red)] text-white shadow-[0_2px_8px_rgba(168,52,38,0.18)] transition hover:-translate-y-px hover:bg-[color:var(--red)]/90 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            {level && (
              <div className="mt-2.5">
                {!hintOpen ? (
                  <button
                    onClick={() => setHintOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--ink-soft)] transition hover:text-[color:var(--red)]"
                  >
                    <Lightbulb className="h-3.5 w-3.5" /> Need a hint?
                  </button>
                ) : (
                  <p className="text-xs leading-relaxed text-[color:var(--ink-soft)]">
                    <span className="font-semibold text-[color:var(--red)]">Hint: </span>
                    {level.hint}
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Completion / scoreboard */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper-raised)] p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[color:var(--ink)]">
              <Trophy className="h-5 w-5 text-[color:var(--red)]" /> Leaderboard
            </h2>
            {done && !submitted && (
              <div className="flex items-center gap-2">
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your name"
                  maxLength={50}
                  className="w-36 rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] px-3 py-1.5 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:border-[color:var(--red)] focus:outline-none"
                />
                <button
                  onClick={submitScore}
                  disabled={busy || !playerName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--red)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--red)]/90 disabled:opacity-40"
                >
                  <Check className="h-4 w-4" /> Submit
                </button>
              </div>
            )}
            {done && submitted && (
              <span className="rounded-full border border-[color:var(--green-soft)] bg-[color:var(--green-bg)] px-3 py-1 text-xs font-bold text-[color:var(--green)]">
                All 10 extracted \u2014 score submitted
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--line)] text-[11px] uppercase tracking-wider text-[color:var(--ink-soft)]">
                  <th className="pb-2 pr-3 font-semibold">#</th>
                  <th className="pb-2 pr-3 font-semibold">Player</th>
                  <th className="pb-2 pr-3 font-semibold">Levels</th>
                  <th className="pb-2 pr-3 font-semibold">Attempts</th>
                  <th className="pb-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-[color:var(--ink-soft)]">
                      No challengers yet. Be the first to break the Sentinel.
                    </td>
                  </tr>
                )}
                {leaderboard.map((row, i) => (
                  <tr key={`${row.rank}-${row.created_at}-${row.player_name}-${i}`} className="border-b border-[color:var(--line)] last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs text-[color:var(--ink-soft)]">
                      {row.rank === 1 ? '👑' : row.rank}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-[color:var(--ink)]">{row.player_name}</td>
                    <td className="py-2.5 pr-3 text-[color:var(--ink-soft)]">{row.levels_completed}/10</td>
                    <td className="py-2.5 pr-3 text-[color:var(--ink-soft)]">{row.attempts}</td>
                    <td className="py-2.5 text-xs text-[color:var(--ink-soft)]">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
}