'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'
import { Logo } from '@/components/Logo'

interface Preset { label: string; prompt: string }

interface DomainInfo {
  domain: string
  description: string
  prompts: Preset[]
}

type Phase = 'setup' | 'detecting' | 'ready' | 'running' | 'done'

function TypingText({ text, speed = 8 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    setDisplayed('')
    indexRef.current = 0
    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1))
        indexRef.current++
      } else {
        clearInterval(interval)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return <span>{displayed}{indexRef.current < text.length && <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />}</span>
}

function ResponseCard({
  label,
  labelClass,
  text,
  loading,
  animate,
}: {
  label: string
  labelClass: string
  text: string
  loading: boolean
  animate: boolean
}) {
  return (
    <div className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
      <div className={`px-5 py-3 border-b border-zinc-800 flex items-center gap-2 ${labelClass}`}>
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="p-5 text-sm text-zinc-300 leading-relaxed flex-1 min-h-40">
        {loading ? (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Generating…</span>
          </div>
        ) : text ? (
          animate ? <TypingText text={text} speed={6} /> : <span className="whitespace-pre-wrap">{text}</span>
        ) : null}
      </div>
    </div>
  )
}

export default function TestPage() {
  const [content, setContent] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [phase, setPhase] = useState<Phase>('setup')
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [genericResponse, setGenericResponse] = useState('')
  const [ctxResponse, setCtxResponse] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [rating, setRating] = useState<1 | -1 | null>(null)

  // Load content from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dotmd_last_content')
      if (stored?.trim()) {
        setContent(stored)
        setPhase('detecting')
      }
    } catch { /* ignore */ }
  }, [])

  // Auto-detect domain when content is set
  useEffect(() => {
    if (phase !== 'detecting' || !content.trim()) return

    let cancelled = false
    async function detect() {
      try {
        const res = await fetch('/api/detect-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        const data = await res.json()
        if (cancelled) return
        if (res.ok) {
          setDomainInfo(data)
          setSelectedPreset(data.prompts[0])
          setPhase('ready')
        } else {
          setError(data.error || 'Domain detection failed')
          setPhase('setup')
        }
      } catch {
        if (!cancelled) { setError('Network error during domain detection'); setPhase('setup') }
      }
    }

    detect()
    return () => { cancelled = true }
  }, [phase, content])

  function handleContentSubmit() {
    if (!content.trim()) return
    setError(null)
    setPhase('detecting')
    setShowPaste(false)
  }

  const activePrompt = useCustom ? customPrompt : (selectedPreset?.prompt ?? '')
  const activeLabel = useCustom ? 'Custom' : (selectedPreset?.label ?? '')

  async function runTest() {
    if (!activePrompt.trim() || !content.trim()) return
    setPhase('running')
    setGenericResponse('')
    setCtxResponse('')
    setError(null)
    setSavedId(null)
    setRating(null)

    try {
      const res = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, prompt: activePrompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Test failed')

      setGenericResponse(data.generic)
      setCtxResponse(data.contextualized)
      setPhase('done')

      // Save to history (non-blocking)
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          prompt: activePrompt,
          task_label: activeLabel,
          detected_domain: domainInfo?.domain,
          response_generic: data.generic,
          response_with_ctx: data.contextualized,
        }),
      })
        .then(r => r.json())
        .then(r => { if (r.id) setSavedId(r.id) })
        .catch(() => {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('ready')
    }
  }

  async function submitRating(value: 1 | -1) {
    setRating(value)
    if (savedId) {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rate_test', test_id: savedId, rating: value }),
      }).catch(() => {})
    }
  }

  function runAgain() {
    setPhase('ready')
    setGenericResponse('')
    setCtxResponse('')
    setRating(null)
    setSavedId(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Nav */}
      <nav className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo size={28} />
            <span className="text-sm font-semibold text-violet-400 tracking-wide group-hover:text-violet-300 transition-colors">DotMD</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/score" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">Score</Link>
            <Link href="/build" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">Build</Link>
            <Show when="signed-in">
              <Link href="/history" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">History</Link>
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-lg transition-colors cursor-pointer">
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs text-violet-400 mb-5">
            AI vs. Your AI
          </div>
          <h1 className="text-3xl font-bold mb-3">Test your context file</h1>
          <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
            See the real difference your context file makes. We run the same prompt twice — once with a generic AI and once with an AI that knows you — side by side.
          </p>
        </div>

        {/* No content state */}
        {(phase === 'setup' || showPaste) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
            {!content && phase === 'setup' && !showPaste ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-4">📄</div>
                <h2 className="text-lg font-semibold mb-2">No context file loaded</h2>
                <p className="text-zinc-400 text-sm mb-6">
                  Score your file first — we&apos;ll auto-load it here. Or paste it directly below.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link
                    href="/score"
                    className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    Score my file →
                  </Link>
                  <button
                    onClick={() => setShowPaste(true)}
                    className="border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    Paste it here
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-3 block">Paste your context file (CLAUDE.md)</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="# My Context File&#10;&#10;## Role&#10;I am a..."
                  rows={10}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleContentSubmit}
                    disabled={!content.trim()}
                    className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    Analyse my file →
                  </button>
                  {showPaste && (
                    <button
                      onClick={() => setShowPaste(false)}
                      className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detecting domain */}
        {phase === 'detecting' && (
          <div className="flex items-center gap-4 py-16 justify-center">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-zinc-400 text-sm">Detecting your domain and generating test prompts…</div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Ready / Running / Done */}
        {(phase === 'ready' || phase === 'running' || phase === 'done') && domainInfo && (
          <>
            {/* Domain chip + change file */}
            <div className="flex items-center gap-3 mb-8 flex-wrap">
              <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-violet-400" />
                <span className="text-sm font-medium text-violet-300">{domainInfo.domain}</span>
              </div>
              <span className="text-sm text-zinc-500">{domainInfo.description}</span>
              <button
                onClick={() => { setShowPaste(true); setPhase('setup') }}
                className="ml-auto text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Change file
              </button>
            </div>

            {/* Prompt selection */}
            {(phase === 'ready') && (
              <div className="mb-8">
                <p className="text-sm font-medium text-zinc-300 mb-4">Choose a task to test</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {domainInfo.prompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedPreset(p); setUseCustom(false) }}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        !useCustom && selectedPreset?.label === p.label
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setUseCustom(true)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      useCustom
                        ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    ✏️ Custom
                  </button>
                </div>

                {/* Prompt preview / custom input */}
                {useCustom ? (
                  <textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="Write your own prompt…"
                    rows={3}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
                  />
                ) : selectedPreset ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-400 italic">
                    &ldquo;{selectedPreset.prompt}&rdquo;
                  </div>
                ) : null}

                <button
                  onClick={runTest}
                  disabled={!activePrompt.trim()}
                  className="mt-5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  <span>Run the test</span>
                  <span>⚡</span>
                </button>
              </div>
            )}

            {/* Results */}
            {(phase === 'running' || phase === 'done') && (
              <div className="space-y-6">
                {/* Active prompt recap */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-400">
                  <span className="text-zinc-600 mr-2">Prompt:</span>
                  <span className="italic">&ldquo;{activePrompt}&rdquo;</span>
                </div>

                {/* Side-by-side */}
                <div className="flex flex-col lg:flex-row gap-4">
                  <ResponseCard
                    label="Generic AI"
                    labelClass="text-zinc-500 bg-zinc-900"
                    text={genericResponse}
                    loading={phase === 'running' && !genericResponse}
                    animate={phase === 'done' && !genericResponse.includes('\n')}
                  />
                  <ResponseCard
                    label="AI with your context"
                    labelClass="text-violet-400 bg-violet-500/5"
                    text={ctxResponse}
                    loading={phase === 'running' && !ctxResponse}
                    animate={phase === 'done' && !ctxResponse.includes('\n')}
                  />
                </div>

                {/* Rating + actions */}
                {phase === 'done' && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200 mb-0.5">Did the right side capture your voice?</p>
                      <p className="text-xs text-zinc-500">Your rating helps us understand what great context files look like.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => submitRating(1)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                          rating === 1
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : 'border-zinc-700 text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-400'
                        }`}
                      >
                        <span>👍</span> Yes, nailed it
                      </button>
                      <button
                        onClick={() => submitRating(-1)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                          rating === -1
                            ? 'bg-red-500/20 border-red-500/50 text-red-400'
                            : 'border-zinc-700 text-zinc-400 hover:border-red-500/40 hover:text-red-400'
                        }`}
                      >
                        <span>👎</span> Not quite
                      </button>
                    </div>
                  </div>
                )}

                {/* CTA row */}
                {phase === 'done' && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={runAgain}
                      className="border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      Test another prompt
                    </button>
                    {rating === -1 && (
                      <Link
                        href="/score"
                        className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <span>Improve my context file</span>
                        <span>↑</span>
                      </Link>
                    )}
                    <Show when="signed-in">
                      <Link
                        href="/history"
                        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 py-2.5"
                      >
                        View all tests in history →
                      </Link>
                    </Show>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
