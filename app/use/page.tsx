'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'
import { Logo } from '@/components/Logo'

type Tool = 'claude' | 'chatgpt' | 'cursor' | 'gemini'

interface ChatGptFormatted {
  about: string
  respond: string
  charCount: number
}

const TOOLS: { id: Tool; name: string; tagline: string; iconBg: string; iconText: string; limit?: string }[] = [
  {
    id: 'claude',
    name: 'Claude.ai Projects',
    tagline: 'Full context — no character limit. Paste into Project Instructions for complete personalisation.',
    iconBg: 'bg-amber-500/20 border-amber-500/30',
    iconText: 'text-amber-400',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    tagline: 'Auto-condensed by AI to fit the 1,500 character Custom Instructions limit.',
    iconBg: 'bg-emerald-500/20 border-emerald-500/30',
    iconText: 'text-emerald-400',
    limit: '1,500 char limit',
  },
  {
    id: 'cursor',
    name: 'Cursor / VS Code',
    tagline: 'Download as CLAUDE.md and drop it in your project root — Cursor reads it automatically.',
    iconBg: 'bg-blue-500/20 border-blue-500/30',
    iconText: 'text-blue-400',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    tagline: 'Formatted as a clean system instruction for Gemini Advanced or Google AI Studio.',
    iconBg: 'bg-violet-500/20 border-violet-500/30',
    iconText: 'text-violet-400',
  },
]

const GUIDE_STEPS: Record<Tool, { title: string; desc: string }[]> = {
  claude: [
    { title: 'Open Claude.ai', desc: 'Go to claude.ai and sign in to your account.' },
    { title: 'Create or open a Project', desc: 'Click "Projects" in the sidebar → New Project, or open an existing one.' },
    { title: 'Paste your file', desc: 'Open Project Instructions, paste the copied content, then click Save.' },
  ],
  chatgpt: [
    { title: 'Open ChatGPT settings', desc: 'Click your avatar → Settings → Personalisation.' },
    { title: 'Open Custom Instructions', desc: 'Click "Custom Instructions" to open the two-field panel.' },
    { title: 'Paste both sections', desc: 'Paste "About you" in the top field and "How to respond" in the bottom. Click Save.' },
  ],
  cursor: [
    { title: 'Save the file', desc: 'Click "Download CLAUDE.md" above and save the file.' },
    { title: 'Place it in your project root', desc: 'Move CLAUDE.md to the root folder of your project (same level as package.json or README).' },
    { title: 'Open a Cursor chat', desc: 'Cursor automatically reads CLAUDE.md. Start a conversation — it now knows your full context.' },
  ],
  gemini: [
    { title: 'Open Gemini Advanced', desc: 'Go to gemini.google.com or Google AI Studio and sign in.' },
    { title: 'Find System Instructions', desc: 'In AI Studio, create a new prompt and paste into the System Instructions field.' },
    { title: 'Start chatting', desc: 'Gemini will use your context for the entire session.' },
  ],
}

const ICONS: Record<Tool, string> = { claude: 'C', chatgpt: 'G', cursor: '↗', gemini: '✦' }

function ToolIcon({ tool }: { tool: (typeof TOOLS)[0] }) {
  return (
    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm flex-shrink-0 ${tool.iconBg} ${tool.iconText}`}>
      {ICONS[tool.id]}
    </div>
  )
}

export default function ExportPage() {
  const [content, setContent] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [activeGuide, setActiveGuide] = useState<Tool>('claude')
  const [guideOpen, setGuideOpen] = useState(true)
  const [copied, setCopied] = useState<Tool | null>(null)
  const [chatgpt, setChatgpt] = useState<ChatGptFormatted | null>(null)
  const [chatgptLoading, setChatgptLoading] = useState(false)
  const [chatgptError, setChatgptError] = useState<string | null>(null)
  const [chatgptCopied, setChatgptCopied] = useState<'about' | 'respond' | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('contextual_labs_last_content')
      if (stored?.trim()) setContent(stored)
    } catch { /* ignore */ }
  }, [])

  const hasContent = content.trim().length > 0

  const copyText = useCallback(async (text: string, tool: Tool) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(tool)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* ignore */ }
  }, [])

  const handleCopy = useCallback(async (tool: Tool) => {
    if (!hasContent) return
    if (tool === 'chatgpt') {
      if (chatgpt) {
        await navigator.clipboard.writeText(`About me:\n${chatgpt.about}\n\nHow to respond:\n${chatgpt.respond}`)
        setCopied('chatgpt')
        setTimeout(() => setCopied(null), 2000)
        return
      }
      setChatgptLoading(true)
      setChatgptError(null)
      try {
        const res = await fetch('/api/format-for-tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, tool: 'chatgpt' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setChatgpt(data)
        await navigator.clipboard.writeText(`About me:\n${data.about}\n\nHow to respond:\n${data.respond}`)
        setCopied('chatgpt')
        setTimeout(() => setCopied(null), 2000)
      } catch (err) {
        setChatgptError(err instanceof Error ? err.message : 'Formatting failed')
      } finally {
        setChatgptLoading(false)
      }
      return
    }
    await copyText(content, tool)
  }, [hasContent, content, chatgpt, copyText])

  const handleDownload = useCallback(() => {
    if (!hasContent) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'CLAUDE.md'; a.click()
    URL.revokeObjectURL(url)
  }, [hasContent, content])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Nav */}
      <nav className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo size={28} />
            <span className="text-sm font-semibold text-violet-400 tracking-wide group-hover:text-violet-300 transition-colors">Contextual Labs</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/score" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">Score</Link>
            <Link href="/build" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">Build</Link>
            <Link href="/test" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">Test</Link>
            <Show when="signed-in">
              <Link href="/history" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">History</Link>
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-lg transition-colors cursor-pointer">Sign in</button>
              </SignInButton>
            </Show>
            <Show when="signed-in"><UserButton /></Show>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs text-violet-400 mb-5">
            Export to AI tools
          </div>
          <h1 className="text-3xl font-bold mb-3">Get your file into any AI tool</h1>
          <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
            Pick your tool — we reformat your context file perfectly for it and show you exactly where to paste it.
          </p>
        </div>

        {/* File banner */}
        {!hasContent && !pasteOpen && (
          <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 mb-6">
            <span className="text-amber-400 text-sm">⚠</span>
            <span className="text-sm text-zinc-400 flex-1">No context file loaded — add yours to enable the export buttons.</span>
            <Link href="/score" className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex-shrink-0">Score first →</Link>
            <button onClick={() => setPasteOpen(true)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
              Paste file
            </button>
          </div>
        )}

        {hasContent && !pasteOpen && (
          <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 mb-6">
            <span className="text-emerald-400 text-sm">✓</span>
            <span className="text-sm text-zinc-400 flex-1">File loaded — choose a tool below to export.</span>
            <button onClick={() => { setPasteOpen(true); setContent('') }} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0">
              ↺ Change file
            </button>
          </div>
        )}

        {/* Inline paste area */}
        {pasteOpen && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
            <label className="text-sm font-medium text-zinc-300 mb-3 block">Paste your context file (CLAUDE.md)</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="# My Context File&#10;&#10;## Role&#10;I am a..."
              rows={8}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setPasteOpen(false)}
                disabled={!content.trim()}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Use this file →
              </button>
              <button onClick={() => { setPasteOpen(false); }} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Tool cards — always visible */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {TOOLS.map(tool => (
            <div
              key={tool.id}
              className={`bg-zinc-900 border rounded-2xl p-5 flex flex-col gap-4 transition-colors ${
                hasContent ? 'border-zinc-800' : 'border-zinc-900 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <ToolIcon tool={tool} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm text-zinc-50">{tool.name}</span>
                    {tool.limit && (
                      <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{tool.limit}</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{tool.tagline}</p>
                </div>
              </div>

              {/* ChatGPT expanded fields */}
              {tool.id === 'chatgpt' && chatgpt && (
                <div className="space-y-3 border-t border-zinc-800 pt-4">
                  {(['about', 'respond'] as const).map(field => (
                    <div key={field}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-zinc-400">{field === 'about' ? 'About me' : 'How to respond'}</span>
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(chatgpt[field])
                            setChatgptCopied(field)
                            setTimeout(() => setChatgptCopied(null), 2000)
                          }}
                          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          {chatgptCopied === field ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre className="text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg p-3 whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto">{chatgpt[field]}</pre>
                    </div>
                  ))}
                  <p className="text-xs text-zinc-600">{chatgpt.charCount} / 1,500 chars used</p>
                </div>
              )}

              {chatgptError && tool.id === 'chatgpt' && (
                <p className="text-xs text-red-400">{chatgptError}</p>
              )}

              <div className="flex gap-2 mt-auto">
                {tool.id === 'cursor' ? (
                  <button
                    onClick={handleDownload}
                    disabled={!hasContent}
                    className="flex-1 border border-zinc-700 hover:border-zinc-500 disabled:cursor-not-allowed text-zinc-300 hover:text-zinc-100 disabled:text-zinc-600 disabled:border-zinc-800 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    ↓ Download CLAUDE.md
                  </button>
                ) : (
                  <button
                    onClick={() => handleCopy(tool.id)}
                    disabled={!hasContent || (chatgptLoading && tool.id === 'chatgpt')}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {chatgptLoading && tool.id === 'chatgpt' ? (
                      <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Formatting…</>
                    ) : copied === tool.id ? '✓ Copied!' : `Copy for ${tool.name.split(' ')[0]}`}
                  </button>
                )}
                <button
                  onClick={() => { setActiveGuide(tool.id); setGuideOpen(true) }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2 flex-shrink-0"
                >
                  Setup ↓
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Setup guide */}
        {guideOpen && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center border-b border-zinc-800 px-5 pt-4">
              <div className="flex gap-1 flex-1">
                {TOOLS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveGuide(t.id)}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      activeGuide === t.id ? 'text-violet-400 border-violet-400' : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                  >
                    {t.name.split(' ')[0]}
                  </button>
                ))}
              </div>
              <button onClick={() => setGuideOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors p-1 mb-1" aria-label="Close">✕</button>
            </div>

            <div className="p-6">
              <p className="text-sm font-semibold text-zinc-200 mb-6">
                How to set up {TOOLS.find(t => t.id === activeGuide)?.name}
              </p>

              <div className="flex flex-col sm:flex-row gap-6 relative mb-8">
                <div className="hidden sm:block absolute top-4 h-px bg-zinc-800" style={{ left: '20px', right: '20px', zIndex: 0 }} />
                {GUIDE_STEPS[activeGuide].map((step, i) => (
                  <div key={i} className="flex-1 relative z-10">
                    <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                      <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{i + 1}</div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-100 sm:mt-3">{step.title}</p>
                        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 border-t border-zinc-800 pt-5">
                {activeGuide === 'cursor' ? (
                  <button onClick={handleDownload} disabled={!hasContent} className="bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                    ↓ Download CLAUDE.md
                  </button>
                ) : (
                  <button
                    onClick={() => handleCopy(activeGuide)}
                    disabled={!hasContent || (chatgptLoading && activeGuide === 'chatgpt')}
                    className="bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {chatgptLoading && activeGuide === 'chatgpt' ? (
                      <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Formatting…</>
                    ) : copied === activeGuide ? '✓ Copied!' : `Copy for ${TOOLS.find(t => t.id === activeGuide)?.name.split(' ')[0]} →`}
                  </button>
                )}
                {!hasContent && (
                  <span className="text-xs text-amber-400/70">Paste your file above to enable</span>
                )}
              </div>
            </div>
          </div>
        )}
        {!guideOpen && (
          <button onClick={() => setGuideOpen(true)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-2">
            ↓ Show setup guides
          </button>
        )}
      </div>
    </div>
  )
}
