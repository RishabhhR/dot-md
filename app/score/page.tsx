'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { ScoreResult, ScoreDimension, OptimizeResult, OptimizeChange } from '@/lib/types'
import { useVoiceRecorder, formatTime } from '@/hooks/useVoiceRecorder'

type Phase = 'input' | 'scoring' | 'scored' | 'optimizing' | 'optimized'
type InputMode = 'paste' | 'upload' | 'voice'

function gradeColors(grade: string) {
  switch (grade) {
    case 'Expert': return { badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', ring: 'text-emerald-500' }
    case 'Proficient': return { badge: 'bg-violet-500/10 border-violet-500/20 text-violet-400', ring: 'text-violet-500' }
    case 'Functional': return { badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400', ring: 'text-amber-500' }
    default: return { badge: 'bg-red-500/10 border-red-500/20 text-red-400', ring: 'text-red-500' }
  }
}

function barColor(score: number, max: number) {
  const pct = score / max
  if (pct >= 0.86) return 'bg-emerald-500'
  if (pct >= 0.66) return 'bg-violet-500'
  if (pct >= 0.41) return 'bg-amber-500'
  return 'bg-red-500'
}

function impactColor(impact: string) {
  switch (impact) {
    case 'High': return 'text-red-400 bg-red-500/10 border-red-500/20'
    case 'Medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
  }
}

function ScoreCircle({ score, grade, animate }: { score: number; grade: string; animate: boolean }) {
  const r = 54
  const circumference = 2 * Math.PI * r
  const colors = gradeColors(grade)
  const [offset, setOffset] = useState(circumference)

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setOffset(circumference * (1 - score / 100)), 100)
      return () => clearTimeout(t)
    }
  }, [animate, score, circumference])

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" className="text-zinc-800" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r}
          fill="none" stroke="currentColor"
          className={`score-circle-track ${colors.ring}`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-bold">{score}</div>
        <div className="text-zinc-500 text-xs">/ 100</div>
      </div>
    </div>
  )
}

function DimensionRow({ dim, animate }: { dim: ScoreDimension; animate: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [width, setWidth] = useState('0%')
  const pct = dim.score / dim.max

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setWidth(`${pct * 100}%`), 150)
      return () => clearTimeout(t)
    }
  }, [animate, pct])

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-zinc-800/50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-200 truncate">{dim.name}</span>
            <span className="text-xs text-zinc-500 ml-4 flex-shrink-0">
              {dim.score}/{dim.max}
            </span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bar-fill ${barColor(dim.score, dim.max)}`}
              style={{ width }}
            />
          </div>
        </div>
        <span className="text-zinc-600 text-xs flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800 bg-zinc-900/50">
          <p className="text-sm text-zinc-400 mt-3 mb-3 leading-relaxed">{dim.feedback}</p>
          {dim.suggestions?.length > 0 && (
            <ul className="space-y-1.5">
              {dim.suggestions.map((s, i) => (
                <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                  <span className="text-violet-400 mt-0.5 flex-shrink-0">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default function ScorePage() {
  const [phase, setPhase] = useState<Phase>('input')
  const [inputMode, setInputMode] = useState<InputMode>('paste')
  const [content, setContent] = useState('')
  const [linkedinText, setLinkedinText] = useState('')
  const [showLinkedin, setShowLinkedin] = useState(false)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [animate, setAnimate] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isRecording, isTranscribing, transcript: voiceTranscript, elapsed, startRecording, stopRecording, resetRecorder, error: voiceError } = useVoiceRecorder()

  // Sync Whisper transcript → content when in voice mode
  useEffect(() => {
    if (voiceTranscript && inputMode === 'voice') setContent(voiceTranscript)
  }, [voiceTranscript, inputMode])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setContent(ev.target?.result as string || '')
    reader.readAsText(file)
  }

  const handleScore = async () => {
    const finalContent = content + (linkedinText ? `\n\nLinkedIn Profile:\n${linkedinText}` : '')
    if (!finalContent.trim()) {
      setError('Please provide some content to score.')
      return
    }
    setError(null)
    setPhase('scoring')

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: finalContent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scoring failed')
      setScoreResult(data)
      setPhase('scored')
      setTimeout(() => setAnimate(true), 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('input')
    }
  }

  const handleOptimize = async () => {
    if (!content.trim()) return
    setPhase('optimizing')
    setError(null)

    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Optimization failed')
      setOptimizeResult(data)
      setPhase('optimized')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('scored')
    }
  }

  const handleDownload = (markdown: string, filename = 'CLAUDE.md') => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
  }

  const reset = () => {
    setPhase('input')
    setContent('')
    setLinkedinText('')
    setScoreResult(null)
    setOptimizeResult(null)
    setError(null)
    setAnimate(false)
    resetRecorder()
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-violet-400 tracking-wide">
            Contextual Labs
          </Link>
          <Link href="/build" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
            Build a file instead →
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* INPUT PHASE */}
        {phase === 'input' && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Score Your Context File</h1>
            <p className="text-zinc-400 mb-8">
              Paste your CLAUDE.md, skill file, or any AI system prompt. We&apos;ll score it across 8 dimensions.
            </p>

            {/* Input mode tabs */}
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-5 gap-1">
              {(['paste', 'upload', 'voice'] as InputMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setInputMode(m); setError(null) }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                    inputMode === m
                      ? 'bg-zinc-700 text-zinc-50'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {m === 'voice' ? '🎙 Voice' : m === 'upload' ? '📄 Upload' : '✏️ Paste'}
                </button>
              ))}
            </div>

            {/* Paste mode */}
            {inputMode === 'paste' && (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your CLAUDE.md, system prompt, or skill file here..."
                className="w-full h-64 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-violet-500/50 font-mono"
              />
            )}

            {/* Upload mode */}
            {inputMode === 'upload' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-64 bg-zinc-900 border-2 border-dashed border-zinc-700 hover:border-violet-500/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors gap-3"
              >
                <div className="text-3xl">📄</div>
                <div className="text-sm text-zinc-400">
                  {content ? (
                    <span className="text-emerald-400">✓ File loaded ({content.length} chars)</span>
                  ) : (
                    'Click to upload .md, .txt, or any text file'
                  )}
                </div>
                <div className="text-xs text-zinc-600">CLAUDE.md, skill files, system prompts</div>
                <input ref={fileInputRef} type="file" accept=".md,.txt,.markdown" className="hidden" onChange={handleFileUpload} />
              </div>
            )}

            {/* Voice mode */}
            {inputMode === 'voice' && (
              <div className="w-full h-64 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-zinc-400">
                    {isRecording ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        Recording — {formatTime(elapsed)} / 2:00
                      </span>
                    ) : isTranscribing ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                        Transcribing with Groq Whisper…
                      </span>
                    ) : voiceTranscript ? 'Transcript ready — scroll to review' : 'Describe your context out loud'}
                  </span>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isRecording ? 'bg-red-600 hover:bg-red-500 text-white'
                      : isTranscribing ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                      : 'bg-violet-600 hover:bg-violet-500 text-white'
                    }`}
                  >
                    {isRecording ? '■ Stop' : isTranscribing ? '…' : '● Record'}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {voiceTranscript ? (
                    <p className="text-sm text-zinc-300 leading-relaxed">{voiceTranscript}</p>
                  ) : (
                    <p className="text-sm text-zinc-600 italic">
                      {isRecording
                        ? `${formatTime(elapsed)} elapsed — stop when ready`
                        : 'Press Record. Works in all browsers — powered by Groq Whisper.'}
                    </p>
                  )}
                </div>
                {(voiceError) && (
                  <p className="text-xs text-red-400 mt-2">{voiceError}</p>
                )}
              </div>
            )}

            {/* LinkedIn section */}
            <div className="mt-4">
              <button
                onClick={() => setShowLinkedin(!showLinkedin)}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showLinkedin ? '▲ Hide' : '▼ Also add'} LinkedIn profile context (optional)
              </button>
              {showLinkedin && (
                <textarea
                  value={linkedinText}
                  onChange={(e) => setLinkedinText(e.target.value)}
                  placeholder="Paste your LinkedIn About section or full profile text here..."
                  className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-violet-500/50 mt-3"
                />
              )}
            </div>

            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleScore}
              disabled={!content.trim() && !voiceTranscript.trim()}
              className="mt-5 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
            >
              Score My File →
            </button>
          </div>
        )}

        {/* SCORING LOADER */}
        {phase === 'scoring' && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <div className="text-lg font-medium mb-1">Analyzing your file…</div>
              <div className="text-zinc-500 text-sm">Scoring across 8 dimensions</div>
            </div>
          </div>
        )}

        {/* SCORED PHASE */}
        {phase === 'scored' && scoreResult && (
          <div className="max-w-2xl mx-auto">
            {/* Score header */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6 flex items-center gap-8">
              <ScoreCircle score={scoreResult.overall} grade={scoreResult.grade} animate={animate} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl font-bold">Your Score</h2>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full border ${gradeColors(scoreResult.grade).badge}`}>
                    {scoreResult.grade}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">{scoreResult.summary}</p>
              </div>
            </div>

            {/* Top improvements */}
            {scoreResult.top_improvements?.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5 mb-6">
                <h3 className="text-sm font-semibold text-amber-400 mb-3">Top improvements</h3>
                <ul className="space-y-2">
                  {scoreResult.top_improvements.map((imp, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-amber-400 flex-shrink-0 mt-0.5">{i + 1}.</span>
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dimension breakdown */}
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wide">Dimension Breakdown</h3>
            <div className="space-y-2 mb-8">
              {scoreResult.dimensions?.map((dim) => (
                <DimensionRow key={dim.name} dim={dim} animate={animate} />
              ))}
            </div>

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleOptimize}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Optimize My File ↑
              </button>
              <button
                onClick={reset}
                className="border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 px-5 py-3 rounded-xl font-medium transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* OPTIMIZING LOADER */}
        {phase === 'optimizing' && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <div className="text-lg font-medium mb-1">Optimizing your file…</div>
              <div className="text-zinc-500 text-sm">Filling gaps, adding specificity, improving structure</div>
            </div>
          </div>
        )}

        {/* OPTIMIZED PHASE */}
        {phase === 'optimized' && optimizeResult && (
          <div className="max-w-2xl mx-auto">
            {/* Score delta */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-6 mb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-zinc-500">{optimizeResult.score_before}</div>
                  <div className="text-xs text-zinc-600 mt-1">Before</div>
                </div>
                <div className="text-2xl text-zinc-600">→</div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400">{optimizeResult.score_after}</div>
                  <div className="text-xs text-zinc-600 mt-1">After</div>
                </div>
                <div className="ml-auto">
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold px-4 py-2 rounded-xl">
                    +{optimizeResult.score_after - optimizeResult.score_before} points
                  </span>
                </div>
              </div>
              <p className="text-zinc-500 text-sm">Your file has been refined across {optimizeResult.changes?.length || 0} sections.</p>
            </div>

            {/* Changes */}
            {optimizeResult.changes?.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">What changed</h3>
                <div className="space-y-3">
                  {optimizeResult.changes.map((c: OptimizeChange, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${impactColor(c.impact)}`}>
                        {c.impact}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-zinc-200">{c.section}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{c.what_changed}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <details className="bg-zinc-900 border border-zinc-800 rounded-2xl mb-6 overflow-hidden">
              <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-zinc-300 hover:text-zinc-50 transition-colors list-none flex items-center justify-between">
                Preview optimized file
                <span className="text-zinc-600 text-xs">click to expand ▼</span>
              </summary>
              <div className="border-t border-zinc-800 px-5 py-4">
                <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-96">
                  {optimizeResult.markdown}
                </pre>
              </div>
            </details>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => handleDownload(optimizeResult.markdown)}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Download CLAUDE.md
              </button>
              <button
                onClick={() => handleCopy(optimizeResult.markdown)}
                className="border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 px-5 py-3 rounded-xl font-medium transition-colors"
              >
                Copy
              </button>
              <button
                onClick={reset}
                className="border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 px-5 py-3 rounded-xl font-medium transition-colors"
              >
                Start Over
              </button>
            </div>

            <div className="mt-4 text-center">
              <Link href="/build" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                Build a fresh file from scratch →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
