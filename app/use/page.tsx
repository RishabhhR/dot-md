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

const ICONS: Record<Tool, string> = {
  claude: 'C',
  chatgpt: 'G',
  cursor: '↗',
  gemini: '✦',
}

function ToolIcon({ tool }: { tool: (typeof TOOLS)[0] }) {
  return (
    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm flex-shrink-0 ${tool.iconBg} ${tool.iconText}`}>
      {ICONS[tool.id]}
    </div>
  )
}

export default function UsePage() {
  const [content, setContent] = useState('')
  const [showPaste, setShowPaste] = useState(false)
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

  const copyText = useCallback(async (text: string, tool: Tool) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(tool)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* ignore */ }
  }, [])

  const handleCopy = useCallback(async (tool: Tool) => {
    if (!content.trim()) return
    if (tool === 'chatgpt') {
      // Lazy-load ChatGPT formatting
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
    // All other tools — copy raw
    await copyText(content, tool)
  }, [content, chatgpt, copyText])

  const handleDownload = useCallback(() => {
    if (!content.trim()) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'CLAUDE.md'
    a.click()
    URL.revokeObjectURL(url)
  }, [content])

  const noContent = !content.trim()

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
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs text-violet-400 mb-5">
            {noContent ? 'No file loaded' : '✓ File ready'}
          </div>
          <h1 className="text-3xl font-bold mb-3">Use your context file</h1>
          <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
            Pick your AI tool — we&apos;ll reformat your file perfectly for it and walk you through setup.
          </p>
        </div>

        {/* No content */}
        {noContent && !showPaste && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-8 text-center">
            <div className="text-4xl mb-4">📄</div>
            <h2 className="text-lg font-semibold mb-2">No context file loaded</h2>
            <p className="text-zinc-400 text-sm mb-6">Score your file first — we&apos;ll auto-load it here. Or paste it directly.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/score" className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">Score my file →</Link>
              <button onClick={() => setShowPaste(true)} className="border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">Paste it here</button>
            </div>
          </div>
        )}

        {showPaste && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
            <label className="text-sm font-medium text-zinc-300 mb-3 block">Paste your context file</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="# My Context File&#10;&#10;## Role&#10;I am a..."
              rows={8}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowPaste(false)} disabled={!content.trim()} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">Use this file →</button>
              <button onClick={() => setShowPaste(false)} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Tool cards */}
        {(!noContent || showPaste) && !showPaste && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {TOOLS.map(tool => (
                <div key={tool.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
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
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-zinc-400">About me</span>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(chatgpt.about)
                              setChatgptCopied('about')
                              setTimeout(() => setChatgptCopied(null), 2000)
                            }}
                            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                          >
                            {chatgptCopied === 'about' ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                        <pre className="text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg p-3 whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto">{chatgpt.about}</pre>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-zinc-400">How to respond</span>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(chatgpt.respond)
                              setChatgptCopied('respond')
                              setTimeout(() => setChatgptCopied(null), 2000)
                            }}
                            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                          >
                            {chatgptCopied === 'respond' ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                        <pre className="text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg p-3 whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto">{chatgpt.respond}</pre>
                      </div>
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
                        className="flex-1 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        ↓ Download CLAUDE.md
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCopy(tool.id)}
                        disabled={chatgptLoading && tool.id === 'chatgpt'}
                        className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {chatgptLoading && tool.id === 'chatgpt' ? (
                          <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Formatting…</>
                        ) : copied === tool.id ? (
                          '✓ Copied!'
                        ) : (
                          `Copy for ${tool.name.split(' ')[0]}`
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => { setActiveGuide(tool.id); setGuideOpen(true) }}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2"
                    >
                      Setup guide ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Change file */}
            <div className="flex justify-end mb-8">
              <button onClick={() => setShowPaste(true)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                ↺ Use a different file
              </button>
            </div>

            {/* Setup guide */}
            {guideOpen && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {/* Tab bar */}
                <div className="flex items-center border-b border-zinc-800 px-5 pt-4">
                  <div className="flex gap-1 flex-1">
                    {TOOLS.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveGuide(t.id)}
                        className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                          activeGuide === t.id
                            ? 'text-violet-400 border-b-2 border-violet-400'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {t.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setGuideOpen(false)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors p-1 mb-1"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6">
                  <p className="text-sm font-semibold text-zinc-200 mb-6">
                    How to use in {TOOLS.find(t => t.id === activeGuide)?.name}
                  </p>

                  {/* Steps */}
                  <div className="flex flex-col sm:flex-row gap-6 relative mb-8">
                    {/* Connecting line (desktop) */}
                    <div className="hidden sm:block absolute top-4 left-4 right-4 h-px bg-zinc-800" style={{ left: '24px', right: '24px', zIndex: 0 }} />

                    {GUIDE_STEPS[activeGuide].map((step, i) => (
                      <div key={i} className="flex-1 relative z-10">
                        <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-100 sm:mt-3">{step.title}</p>
                            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{step.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-4 border-t border-zinc-800 pt-5">
                    {activeGuide === 'cursor' ? (
                      <button onClick={handleDownload} className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                        ↓ Download CLAUDE.md →
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCopy(activeGuide)}
                        disabled={chatgptLoading && activeGuide === 'chatgpt'}
                        className="bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        {chatgptLoading && activeGuide === 'chatgpt' ? (
                          <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Formatting…</>
                        ) : copied === activeGuide ? '✓ Copied!' : (
                          `Copy for ${TOOLS.find(t => t.id === activeGuide)?.name.split(' ')[0]} →`
                        )}
                      </button>
                    )}
                    <span className="text-xs text-zinc-500">Your file is formatted and ready above</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
