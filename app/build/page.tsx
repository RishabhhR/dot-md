'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'
import { Logo } from '@/components/Logo'
import { useVoiceRecorder, formatTime } from '@/hooks/useVoiceRecorder'

type BuildPhase = 'mode' | 'guided' | 'voice' | 'linkedin' | 'cv' | 'generating' | 'result'

const STEPS = [
  {
    key: 'role',
    title: 'Who are you?',
    description: 'Your role, title, company type, years of experience',
    placeholder:
      'e.g. Senior backend engineer at a Series B fintech startup, 7 years experience. Day-to-day I own the payments infrastructure and lead a team of 3...',
  },
  {
    key: 'tech_stack',
    title: 'What do you build with?',
    description: 'Languages, frameworks, tools, databases, infrastructure',
    placeholder:
      'e.g. Primary: Go, PostgreSQL, Redis, Kubernetes on AWS. Secondary: Python for scripting, React for occasional frontend. Use Terraform for infra...',
  },
  {
    key: 'communication',
    title: 'How do you want responses?',
    description: 'Format preferences, verbosity, tone, code style',
    placeholder:
      "e.g. Short and direct. Code examples over explanations. Bullet points for lists. No filler phrases. If I ask a simple question, give a simple answer...",
  },
  {
    key: 'work_patterns',
    title: 'How do you work?',
    description: 'Your workflow, what you use AI for, what you do yourself',
    placeholder:
      'e.g. I use AI for code review, debugging, and generating boilerplate. I write my own architecture docs and system designs. Strong opinions on DB schema...',
  },
  {
    key: 'expertise',
    title: 'What do you know deeply?',
    description: 'Strong knowledge areas and technical specializations',
    placeholder:
      'e.g. Expert in distributed systems and database optimization. Strong in Go and Postgres internals. Know ML concepts but not an ML engineer. Weak in CSS...',
  },
  {
    key: 'constraints',
    title: 'What should AI never do?',
    description: 'Hard rules, pet peeves, and dealbreakers',
    placeholder:
      "e.g. Never start with 'Certainly!' or 'Great question!'. Don't add type: ignore in Python. Never suggest over-engineering a simple problem. No emojis...",
  },
  {
    key: 'goals',
    title: "What does 'good' look like for you?",
    description: 'Priorities, quality bar, what makes output useful',
    placeholder:
      'e.g. Correctness over brevity. Production-ready code, not POC hacks. Always explain tradeoffs when there are multiple approaches. Flag security issues proactively...',
  },
  {
    key: 'collaboration',
    title: 'How should AI work with you?',
    description: 'Autonomy level, when to ask vs assume, handling uncertainty',
    placeholder:
      "e.g. Ask before making big architectural decisions. One clarifying question max if intent is unclear. Be direct about what you don't know. Don't pad answers...",
  },
]

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < current
              ? 'bg-emerald-500 flex-1'
              : i === current
              ? 'bg-violet-500 flex-[2]'
              : 'bg-zinc-800 flex-1'
          }`}
        />
      ))}
    </div>
  )
}

export default function BuildPage() {
  const [phase, setPhase] = useState<BuildPhase>('mode')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [linkedinPaste, setLinkedinPaste] = useState('')
  const [linkedinPdfFile, setLinkedinPdfFile] = useState<File | null>(null)
  const [linkedinPdfText, setLinkedinPdfText] = useState('')
  const [linkedinPdfExtracting, setLinkedinPdfExtracting] = useState(false)
  const [linkedinCookie, setLinkedinCookie] = useState('')
  const [linkedinProfileUrl, setLinkedinProfileUrl] = useState('')
  const [cvText, setCvText] = useState('')
  const [cvPdfFile, setCvPdfFile] = useState<File | null>(null)
  const [cvPdfExtracting, setCvPdfExtracting] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [generatedMarkdown, setGeneratedMarkdown] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { isRecording, isTranscribing, transcript: voiceTranscript, elapsed, startRecording, stopRecording, resetRecorder, error: voiceError } = useVoiceRecorder()

  const handleSuggest = async () => {
    setIsSuggesting(true)
    setError(null)
    try {
      const res = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'suggest',
          step: STEPS[step].key,
          answers,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Suggestion failed')
      if (data.suggestion) setCurrentAnswer(data.suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestion')
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleNext = () => {
    const newAnswers = { ...answers, [STEPS[step].key]: currentAnswer }
    setAnswers(newAnswers)
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      setCurrentAnswer(newAnswers[STEPS[step + 1].key] || '')
    } else {
      generateFile('guided', newAnswers)
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setAnswers((prev) => ({ ...prev, [STEPS[step].key]: currentAnswer }))
      setStep(step - 1)
      setCurrentAnswer(answers[STEPS[step - 1].key] || '')
    } else {
      setPhase('mode')
    }
  }

  const handlePdfUpload = async (file: File) => {
    setLinkedinPdfFile(file)
    setLinkedinPdfExtracting(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      const res = await fetch('/api/linkedin-pdf', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'PDF extraction failed')
      setLinkedinPdfText(data.text ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read PDF')
      setLinkedinPdfFile(null)
      setLinkedinPdfText('')
    } finally {
      setLinkedinPdfExtracting(false)
    }
  }

  const handleCvPdfUpload = async (file: File) => {
    setCvPdfFile(file)
    setCvPdfExtracting(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      const res = await fetch('/api/linkedin-pdf', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'PDF extraction failed')
      setCvText(data.text ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read PDF')
      setCvPdfFile(null)
      setCvText('')
    } finally {
      setCvPdfExtracting(false)
    }
  }

  const generateCv = async () => {
    if (!cvText.trim()) return
    setPhase('generating')
    setError(null)
    try {
      const res = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'cv', cv_text: cvText }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Generation failed')
      if (!result.markdown) throw new Error('No content generated')
      setGeneratedMarkdown(result.markdown)
      setPhase('result')
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: result.markdown, source: 'cv' }),
      }).catch(() => {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('cv')
    }
  }

  const generateLinkedin = async () => {
    setPhase('generating')
    setError(null)
    let scrapedProfile = ''
    let scrapedPosts = ''

    if (linkedinCookie.trim() && linkedinProfileUrl.trim()) {
      try {
        const res = await fetch('/api/linkedin-scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ li_at: linkedinCookie, profileUrl: linkedinProfileUrl }),
        })
        const data = await res.json()
        if (res.ok) {
          scrapedProfile = data.profileText ?? ''
          scrapedPosts = data.postsText ?? ''
        }
        // Non-fatal: if scraping fails, continue with paste/PDF data
      } catch {
        // ignore scrape errors
      }
    }

    try {
      const res = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'linkedin',
          linkedin_paste: linkedinPaste,
          linkedin_pdf_text: linkedinPdfText,
          linkedin_profile: scrapedProfile,
          linkedin_posts: scrapedPosts,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Generation failed')
      if (!result.markdown) throw new Error('No content generated')
      setGeneratedMarkdown(result.markdown)
      setPhase('result')
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: result.markdown, source: 'linkedin' }),
      }).catch(() => {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('linkedin')
    }
  }

  const generateFile = async (mode: string, data?: Record<string, string> | string) => {
    setPhase('generating')
    setError(null)

    const body =
      mode === 'guided'
        ? { mode, answers: data as Record<string, string> }
        : mode === 'voice'
        ? { mode, transcript: data as string }
        : { mode: 'linkedin', linkedin_text: data as string }

    try {
      const res = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Generation failed')
      if (!result.markdown) throw new Error('No content generated')
      setGeneratedMarkdown(result.markdown)
      setPhase('result')
      // Save to DB (non-blocking)
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: result.markdown, source: mode }),
      }).catch(() => {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase(mode === 'guided' ? 'guided' : mode === 'voice' ? 'voice' : 'linkedin')
    }
  }

  const handleDownload = () => {
    const blob = new Blob([generatedMarkdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'CLAUDE.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedMarkdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setPhase('mode')
    setStep(0)
    setAnswers({})
    setCurrentAnswer('')
    setLinkedinPaste('')
    setLinkedinPdfFile(null)
    setLinkedinPdfText('')
    setLinkedinPdfExtracting(false)
    setLinkedinCookie('')
    setLinkedinProfileUrl('')
    setCvText('')
    setCvPdfFile(null)
    setCvPdfExtracting(false)
    setGeneratedMarkdown('')
    setError(null)
    resetRecorder()
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo size={28} />
            <span className="text-sm font-semibold text-violet-400 tracking-wide group-hover:text-violet-300 transition-colors">DotMD</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/history" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
              History
            </Link>
            <Link href="/score" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
              Score an existing file →
            </Link>
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

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* MODE SELECTION */}
        {phase === 'mode' && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Build Your Context File</h1>
            <p className="text-zinc-400 mb-10">
              Choose how you&apos;d like to create your AI context file. All three paths generate a complete,
              downloadable CLAUDE.md.
            </p>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  icon: '✏️',
                  mode: 'guided' as const,
                  title: 'Guided (8 questions)',
                  desc: 'Answer 8 focused questions about your role, stack, preferences, and constraints. AI helps you fill in each section.',
                  badge: 'Most thorough',
                  badgeColor: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
                },
                {
                  icon: '🎙',
                  mode: 'voice' as const,
                  title: 'Voice Input',
                  desc: "Talk for 1-2 minutes about what you do, how you work, and what you need from AI. We'll structure it into a file.",
                  badge: 'Fastest',
                  badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                },
                {
                  icon: '💼',
                  mode: 'linkedin' as const,
                  title: 'Import from LinkedIn',
                  desc: 'Copy your LinkedIn profile text and paste it below. AI extracts your role, skills, and expertise to build your file.',
                  badge: 'Zero effort',
                  badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                },
                {
                  icon: '📄',
                  mode: 'cv' as const,
                  title: 'Upload CV / Resume',
                  desc: 'Drop in your CV or resume as a PDF or paste the text. AI extracts your work history, skills, and expertise — no questions asked.',
                  badge: 'Unguided',
                  badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
                },
              ].map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => {
                    setPhase(opt.mode)
                    if (opt.mode === 'guided') setCurrentAnswer(answers[STEPS[0].key] || '')
                  }}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 text-left transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{opt.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold">{opt.title}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${opt.badgeColor}`}>
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed">{opt.desc}</p>
                    </div>
                    <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors mt-1">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GUIDED MODE */}
        {phase === 'guided' && (
          <div className="max-w-3xl mx-auto">
            <StepIndicator current={step} total={STEPS.length} />

            <div className="flex gap-8">
              {/* Left: question */}
              <div className="flex-1">
                <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">
                  Step {step + 1} of {STEPS.length}
                </div>
                <h2 className="text-2xl font-bold mb-1">{STEPS[step].title}</h2>
                <p className="text-zinc-400 text-sm mb-6">{STEPS[step].description}</p>

                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder={STEPS[step].placeholder}
                  className="w-full h-44 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-violet-500/50"
                />

                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={handleSuggest}
                    disabled={isSuggesting}
                    className="text-sm text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSuggesting ? (
                      <>
                        <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                        Generating…
                      </>
                    ) : (
                      '✦ AI Suggest'
                    )}
                  </button>
                  <span className="text-xs text-zinc-600">Press to get an AI-generated suggestion you can edit</span>
                </div>

                {error && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleBack}
                    className="border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 px-5 py-3 rounded-xl font-medium transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-medium transition-colors"
                  >
                    {step === STEPS.length - 1 ? 'Generate My File →' : 'Next →'}
                  </button>
                </div>
              </div>

              {/* Right: live preview */}
              <div className="w-64 flex-shrink-0 hidden lg:block">
                <div className="text-xs text-zinc-600 uppercase tracking-wide mb-3">Preview</div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-80 overflow-y-auto">
                  <pre className="text-xs text-zinc-500 font-mono whitespace-pre-wrap leading-relaxed">
                    {STEPS.slice(0, step + 1).map((s, i) => {
                      const val = i < step ? answers[s.key] : currentAnswer
                      return val
                        ? `## ${s.title}\n${val}\n\n`
                        : `## ${s.title}\n...\n\n`
                    }).join('')}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VOICE MODE */}
        {phase === 'voice' && (
          <div className="max-w-2xl mx-auto">
            <button onClick={() => setPhase('mode')} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8">
              ← Back
            </button>
            <h2 className="text-2xl font-bold mb-2">Voice Input</h2>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              Speak naturally for 1-2 minutes. Cover who you are, what you build, how you like to communicate,
              and what you want AI to help with. Don&apos;t worry about structure — we&apos;ll handle that.
            </p>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
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
                  ) : voiceTranscript ? (
                    'Transcript ready — review then generate'
                  ) : (
                    'Press record to start'
                  )}
                </span>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isRecording ? 'bg-red-600 hover:bg-red-500 text-white'
                    : isTranscribing ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                  }`}
                >
                  {isRecording ? '■ Stop' : isTranscribing ? '…' : '● Record'}
                </button>
              </div>

              <div className="h-48 overflow-y-auto">
                {voiceTranscript ? (
                  <p className="text-sm text-zinc-300 leading-relaxed">{voiceTranscript}</p>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-zinc-600 text-sm text-center">
                      {isRecording
                        ? `${formatTime(elapsed)} elapsed — stop when ready`
                        : 'Powered by Groq Whisper. Works in all browsers.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {(error || voiceError) && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error || voiceError}
              </div>
            )}

            <button
              onClick={() => generateFile('voice', voiceTranscript)}
              disabled={!voiceTranscript.trim() || isTranscribing}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
            >
              Generate My File →
            </button>
          </div>
        )}

        {/* LINKEDIN MODE */}
        {phase === 'linkedin' && (() => {
          const hasPaste = linkedinPaste.trim().length > 0
          const hasPdf = linkedinPdfText.length > 0
          const hasCookie = linkedinCookie.trim().length > 0 && linkedinProfileUrl.trim().length > 0
          const hasAny = hasPaste || hasPdf || hasCookie

          return (
            <div className="max-w-2xl mx-auto">
              <button onClick={() => setPhase('mode')} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8">
                ← Back
              </button>
              <h2 className="text-2xl font-bold mb-2">Import from LinkedIn</h2>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                LinkedIn gives us your career history, skills, and expertise to build your context file.
                Use any combination below — more sources means a better result.
              </p>

              {/* Option 1: Copy & Paste */}
              <div className="mb-5 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">Copy &amp; Paste</span>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">Basic</span>
                  </div>
                  {hasPaste && <span className="text-xs text-emerald-400">✓ Added</span>}
                </div>
                <div className="px-5 py-4">
                  <ol className="text-xs text-zinc-500 space-y-1 mb-3 list-decimal list-inside">
                    <li>Go to your LinkedIn profile page</li>
                    <li>Press <span className="text-zinc-300 bg-zinc-800 px-1 rounded font-mono">Ctrl+A</span> to select all, then <span className="text-zinc-300 bg-zinc-800 px-1 rounded font-mono">Ctrl+C</span> to copy</li>
                    <li>Paste here — the more text the better</li>
                  </ol>
                  <textarea
                    value={linkedinPaste}
                    onChange={(e) => setLinkedinPaste(e.target.value)}
                    placeholder="Paste your LinkedIn profile text here…"
                    className="w-full h-28 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              {/* Option 2: PDF Upload */}
              <div className="mb-5 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">Upload PDF</span>
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Recommended</span>
                  </div>
                  {hasPdf && <span className="text-xs text-emerald-400">✓ Extracted</span>}
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs text-zinc-500 mb-3">
                    LinkedIn exports a clean PDF with your full profile. It takes 2 seconds and gives us much better structured data than copy-paste.
                  </p>
                  <ol className="text-xs text-zinc-500 space-y-1 mb-4 list-decimal list-inside">
                    <li>Go to your LinkedIn profile</li>
                    <li>Click the <span className="text-zinc-300">&quot;More&quot;</span> button → <span className="text-zinc-300">&quot;Save to PDF&quot;</span></li>
                    <li>Upload the downloaded file below</li>
                  </ol>
                  <label
                    className="block cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const file = e.dataTransfer.files[0]
                      if (file?.type === 'application/pdf') handlePdfUpload(file)
                    }}
                  >
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePdfUpload(file)
                      }}
                    />
                    <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
                      hasPdf ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/30'
                    }`}>
                      {linkedinPdfExtracting ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                          Extracting text from PDF…
                        </div>
                      ) : hasPdf ? (
                        <div className="text-sm text-emerald-400">
                          ✓ {linkedinPdfFile?.name} — {linkedinPdfText.split(/\s+/).filter(Boolean).length.toLocaleString()} words extracted
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-500">
                          <span className="text-zinc-300 font-medium">Click to upload</span> or drag &amp; drop your LinkedIn PDF
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Option 3: Session Cookie */}
              <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">Session Cookie</span>
                    <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">Best results</span>
                  </div>
                  {hasCookie && <span className="text-xs text-emerald-400">✓ Ready</span>}
                </div>
                <div className="px-5 py-4">
                  <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl px-4 py-3 mb-4">
                    <p className="text-xs text-violet-300 leading-relaxed">
                      Your session cookie lets us fetch your profile <em>and</em> recent posts directly from LinkedIn.
                      This gives the AI your actual writing voice — making your CLAUDE.md far more personalized.
                    </p>
                  </div>
                  <ol className="text-xs text-zinc-500 space-y-1 mb-4 list-decimal list-inside">
                    <li>Open LinkedIn in Chrome or Firefox while logged in</li>
                    <li>Press <span className="text-zinc-300 bg-zinc-800 px-1 rounded font-mono">F12</span> → <span className="text-zinc-300">Application</span> tab → <span className="text-zinc-300">Cookies</span> → <span className="text-zinc-300">linkedin.com</span></li>
                    <li>Find the cookie named <span className="text-zinc-300 bg-zinc-800 px-1 rounded font-mono">li_at</span> and copy its value</li>
                  </ol>
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={linkedinProfileUrl}
                      onChange={(e) => setLinkedinProfileUrl(e.target.value)}
                      placeholder="https://www.linkedin.com/in/your-username"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50"
                    />
                    <input
                      type="password"
                      value={linkedinCookie}
                      onChange={(e) => setLinkedinCookie(e.target.value)}
                      placeholder="Paste your li_at cookie value"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50"
                    />
                    <p className="text-xs text-zinc-600">🔒 Sent only for this request — never logged or stored.</p>
                  </div>
                </div>
              </div>

              {/* Sources summary */}
              {hasAny && (
                <div className="mb-4 flex items-center gap-2 flex-wrap text-xs text-zinc-500">
                  <span>Will use:</span>
                  {hasPaste && <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full">paste</span>}
                  {hasPdf && <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full">PDF</span>}
                  {hasCookie && <span className="bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-1 rounded-full">cookie + posts</span>}
                </div>
              )}

              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={generateLinkedin}
                disabled={!hasAny || linkedinPdfExtracting}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
              >
                Generate My File →
              </button>
            </div>
          )
        })()}

        {/* CV MODE */}
        {phase === 'cv' && (
          <div className="max-w-2xl mx-auto">
            <button onClick={() => setPhase('mode')} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8">
              ← Back
            </button>
            <h2 className="text-2xl font-bold mb-2">Upload CV / Resume</h2>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              Upload your CV as a PDF or paste the text directly. AI will extract your work history, skills, and expertise
              to generate a personalized CLAUDE.md — no guided questions needed.
            </p>

            {/* PDF upload zone */}
            <div className="mb-5 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">Upload PDF</span>
                  <span className="text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">Recommended</span>
                </div>
                {cvPdfFile && !cvPdfExtracting && cvText && (
                  <span className="text-xs text-emerald-400">✓ Extracted</span>
                )}
              </div>
              <div className="px-5 py-4">
                <label
                  className="block cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files[0]
                    if (file?.type === 'application/pdf') handleCvPdfUpload(file)
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleCvPdfUpload(file)
                    }}
                  />
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                    cvPdfFile && cvText
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/30'
                  }`}>
                    {cvPdfExtracting ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                        <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                        Reading your CV…
                      </div>
                    ) : cvPdfFile && cvText ? (
                      <div className="text-sm text-emerald-400">
                        ✓ {cvPdfFile.name} — {cvText.split(/\s+/).filter(Boolean).length.toLocaleString()} words extracted
                      </div>
                    ) : (
                      <div>
                        <div className="text-2xl mb-2">📄</div>
                        <div className="text-sm text-zinc-400">
                          <span className="text-zinc-200 font-medium">Click to upload</span> or drag &amp; drop
                        </div>
                        <div className="text-xs text-zinc-600 mt-1">PDF format · Any CV or resume</div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Paste fallback */}
            <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-200">Or paste text</span>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">Alternative</span>
              </div>
              <div className="px-5 py-4">
                <textarea
                  value={cvPdfFile ? '' : cvText}
                  onChange={(e) => {
                    setCvPdfFile(null)
                    setCvText(e.target.value)
                  }}
                  disabled={!!cvPdfFile}
                  placeholder={cvPdfFile ? 'PDF already loaded — remove it to paste manually' : 'Paste your CV or resume text here…'}
                  className="w-full h-36 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-sky-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                />
                {cvPdfFile && (
                  <button
                    onClick={() => { setCvPdfFile(null); setCvText('') }}
                    className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    ✕ Remove PDF and paste manually
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={generateCv}
              disabled={!cvText.trim() || cvPdfExtracting}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
            >
              Generate My File →
            </button>
          </div>
        )}

        {/* GENERATING LOADER */}
        {phase === 'generating' && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <div className="text-lg font-medium mb-1">Building your context file…</div>
              <div className="text-zinc-500 text-sm">Crafting a personalized CLAUDE.md</div>
            </div>
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && generatedMarkdown && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">✓</span>
              <h2 className="text-2xl font-bold">Your file is ready</h2>
            </div>
            <p className="text-zinc-400 text-sm mb-8">
              Download it and drop it into your project as{' '}
              <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">CLAUDE.md</code> or add it as
              a system prompt in any AI tool.
            </p>

            {/* Preview */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl mb-6 overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">CLAUDE.md</span>
                <span className="text-xs text-zinc-600">{generatedMarkdown.length} chars</span>
              </div>
              <div className="p-5 max-h-96 overflow-y-auto">
                <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">
                  {generatedMarkdown}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleDownload}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Download CLAUDE.md
              </button>
              <button
                onClick={handleCopy}
                className="border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 px-5 py-3 rounded-xl font-medium transition-colors min-w-24"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                onClick={reset}
                className="border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 px-5 py-3 rounded-xl font-medium transition-colors"
              >
                Start Over
              </button>
            </div>

            <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-4 text-center">
              <p className="text-sm text-zinc-400 mb-2">Want to see how your new file scores?</p>
              <Link
                href="/score"
                className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                Score & optimize this file →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
