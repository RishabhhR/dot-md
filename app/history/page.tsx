'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Logo } from '@/components/Logo'

interface MdFile {
  id: string
  content: string
  overall_score: number | null
  grade: string | null
  score_json: string | null
  source: string
  label: string | null
  created_at: number
}

interface TestResult {
  id: string
  prompt: string
  task_label: string | null
  detected_domain: string | null
  response_generic: string
  response_with_ctx: string
  rating: number | null
  created_at: number
}

function gradeColors(grade: string | null) {
  switch (grade) {
    case 'Expert':     return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    case 'Proficient': return 'bg-violet-500/10 border-violet-500/20 text-violet-400'
    case 'Functional': return 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    case 'Beginner':   return 'bg-red-500/10 border-red-500/20 text-red-400'
    default:           return 'bg-zinc-800 border-zinc-700 text-zinc-400'
  }
}

function scoreColor(score: number) {
  if (score >= 86) return 'text-emerald-400'
  if (score >= 66) return 'text-violet-400'
  if (score >= 41) return 'text-amber-400'
  return 'text-red-400'
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function sourceLabel(source: string) {
  const map: Record<string, string> = {
    guided: 'Guided',
    voice: 'Voice',
    linkedin: 'LinkedIn',
    paste: 'Pasted',
    upload: 'Uploaded',
    optimized: 'Optimized',
    unknown: 'Manual',
  }
  return map[source] ?? source
}

// ── Progression chart (scores over time) ──────────────────────────────
function ProgressionChart({ files }: { files: MdFile[] }) {
  const scored = [...files].reverse().filter((f) => f.overall_score !== null)
  if (scored.length < 2) return null

  const scores = scored.map((f) => f.overall_score as number)
  const min = Math.max(0, Math.min(...scores) - 10)
  const max = Math.min(100, Math.max(...scores) + 10)
  const range = max - min || 1

  const w = 520
  const h = 120
  const pad = { l: 32, r: 16, t: 16, b: 24 }
  const chartW = w - pad.l - pad.r
  const chartH = h - pad.t - pad.b

  const px = (i: number) => pad.l + (i / (scores.length - 1)) * chartW
  const py = (s: number) => pad.t + (1 - (s - min) / range) * chartH

  const polyline = scores.map((s, i) => `${px(i)},${py(s)}`).join(' ')
  const area = `M${px(0)},${py(scores[0])} ` +
    scores.slice(1).map((s, i) => `L${px(i + 1)},${py(s)}`).join(' ') +
    ` L${px(scores.length - 1)},${pad.t + chartH} L${px(0)},${pad.t + chartH} Z`

  const first = scores[0]
  const last = scores[scores.length - 1]
  const delta = last - first
  const improved = delta > 0

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-semibold text-zinc-100">Score Progression</h3>
          <p className="text-zinc-500 text-sm mt-0.5">
            {scored.length} scored iterations · {formatDate(scored[0].created_at)} → {formatDate(scored[scored.length - 1].created_at)}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${improved ? 'text-emerald-400' : 'text-red-400'}`}>
            {improved ? '+' : ''}{delta} pts
          </div>
          <div className="text-zinc-500 text-xs mt-0.5">
            {first} → {last}
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.t + t * chartH
          const label = Math.round(max - t * range)
          return (
            <g key={t}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#27272a" strokeWidth="1" />
              <text x={pad.l - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#52525b">{label}</text>
            </g>
          )
        })}
        {/* Area fill */}
        <path d={area} fill="url(#areaGrad)" opacity="0.3" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {scores.map((s, i) => (
          <circle key={i} cx={px(i)} cy={py(s)} r="3" fill="#8b5cf6" />
        ))}
        {/* Start / end labels */}
        <text x={px(0)} y={py(first) - 8} textAnchor="middle" fontSize="10" fill="#a1a1aa">{first}</text>
        <text x={px(scores.length - 1)} y={py(last) - 8} textAnchor="middle" fontSize="10" fill={improved ? '#34d399' : '#f87171'}>{last}</text>

        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// ── Test results section ──────────────────────────────────────────────
function TestCard({ test }: { test: TestResult }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {test.detected_domain && (
              <span className="text-xs bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2.5 py-0.5 rounded-full">
                {test.detected_domain}
              </span>
            )}
            {test.task_label && (
              <span className="text-xs text-zinc-400 font-medium">{test.task_label}</span>
            )}
            {test.rating === 1 && (
              <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">👍 Nailed it</span>
            )}
            {test.rating === -1 && (
              <span className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full">👎 Not quite</span>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate italic">&ldquo;{test.prompt}&rdquo;</p>
          <div className="text-xs text-zinc-700 mt-1">{formatDate(test.created_at)}</div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 flex-shrink-0"
        >
          {expanded ? 'Hide ↑' : 'View ↓'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-zinc-800 p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide mb-2">Generic AI</p>
            <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{test.response_generic}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-violet-500 uppercase tracking-wide mb-2">With your context</p>
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{test.response_with_ctx}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function HistoryPage() {
  const router = useRouter()
  const [files, setFiles] = useState<MdFile[]>([])
  const [tests, setTests] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [profileUrl, setProfileUrl] = useState<string | null>(null)
  const [profileCopied, setProfileCopied] = useState(false)

  // Load a history file back into the app, then navigate to the target page
  const loadFile = (file: MdFile, dest: 'score' | 'test' | 'use') => {
    try {
      localStorage.setItem('contextual_labs_last_content', file.content)
      if (file.score_json) {
        try {
          const parsed = JSON.parse(file.score_json)
          localStorage.setItem('contextual_labs_last_score_full', file.score_json)
          localStorage.setItem('contextual_labs_last_score', JSON.stringify({
            overall: parsed.overall,
            grade: parsed.grade,
            dimensions: (parsed.dimensions ?? []).slice(0, 4).map((d: { name: string; score: number; max: number }) => ({ name: d.name, score: d.score, max: d.max })),
            improvements: parsed.top_improvements?.length ?? 0,
          }))
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }

    if (dest === 'score') router.push('/score?restore=1')
    else if (dest === 'test') router.push('/test')
    else router.push('/use')
  }

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setFiles(d.files ?? [])
        setTests(d.tests ?? [])
        if (d.username) {
          setProfileUrl(`${window.location.origin}/u/${d.username}`)
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const scoredFiles = files.filter((f) => f.overall_score !== null)
  const showProgression = scoredFiles.length >= 6

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo size={28} />
            <span className="text-sm font-semibold text-violet-400 tracking-wide group-hover:text-violet-300 transition-colors">Contextual Labs</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/score" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">Score</Link>
            <Link href="/build" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">Build</Link>
            <UserButton />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold mb-2">Your History</h1>
              <p className="text-zinc-400 text-sm">
                Every context file you&apos;ve scored or built — your progress over time.
              </p>
            </div>

            {/* Share profile */}
            {profileUrl && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center gap-3 flex-shrink-0">
                <div className="text-xs text-zinc-400 truncate max-w-44 hidden sm:block">{profileUrl.replace('https://', '')}</div>
                <Link href={profileUrl} target="_blank" className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex-shrink-0">
                  View →
                </Link>
                <button
                  onClick={() => { navigator.clipboard.writeText(profileUrl); setProfileCopied(true); setTimeout(() => setProfileCopied(false), 2000) }}
                  className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                >
                  {profileCopied ? '✓ Copied' : 'Share'}
                </button>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && files.length === 0 && tests.length === 0 && (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-zinc-400 mb-6">No files yet. Score or build your first context file.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/score" className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Score a file
              </Link>
              <Link href="/build" className="border border-zinc-700 hover:border-zinc-600 text-zinc-300 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Build a file
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && (files.length > 0 || tests.length > 0) && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total files', value: files.length },
                { label: 'Scored', value: scoredFiles.length },
                {
                  label: 'Best score',
                  value: scoredFiles.length > 0
                    ? Math.max(...scoredFiles.map((f) => f.overall_score as number))
                    : '—',
                },
                { label: 'Tests run', value: tests.length },
              ].map((s) => (
                <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="text-2xl font-bold text-zinc-50">{s.value}</div>
                  <div className="text-zinc-500 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progression chart — shown when ≥ 6 scored iterations */}
            {showProgression && <ProgressionChart files={scoredFiles} />}

            {!showProgression && scoredFiles.length > 0 && scoredFiles.length < 6 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 mb-8 flex items-center gap-3 text-sm text-zinc-400">
                <span className="text-lg">📈</span>
                Score <span className="text-zinc-200 font-medium">{scoredFiles.length}</span> more file{scoredFiles.length === 1 ? '' : 's'} to unlock your progression chart ({6 - scoredFiles.length} to go).
              </div>
            )}

            {/* Tests section */}
            {tests.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Test Runs</h2>
                  <Link href="/test" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                    Run another test →
                  </Link>
                </div>
                <div className="space-y-3">
                  {tests.map((test) => <TestCard key={test.id} test={test} />)}
                </div>
              </div>
            )}

            {/* File list */}
            {files.length > 0 && (
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-4">Context Files</h2>
            </div>
            )}
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  {/* Header row */}
                  <div className="px-5 py-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {file.overall_score !== null && (
                          <span className={`text-lg font-bold ${scoreColor(file.overall_score)}`}>
                            {file.overall_score}
                          </span>
                        )}
                        {file.grade && (
                          <span className={`text-xs border px-2 py-0.5 rounded-full ${gradeColors(file.grade)}`}>
                            {file.grade}
                          </span>
                        )}
                        <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                          {sourceLabel(file.source)}
                        </span>
                        {file.label && (
                          <span className="text-xs text-zinc-400">{file.label}</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-600 mt-1">{formatDate(file.created_at)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => loadFile(file, 'score')}
                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-violet-500/10"
                        title="Open in score view"
                      >
                        Open →
                      </button>
                      <button
                        onClick={() => loadFile(file, 'test')}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-zinc-800"
                        title="Test this file"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => loadFile(file, 'use')}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-zinc-800"
                        title="Export to AI tools"
                      >
                        Export
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob([file.content], { type: 'text/markdown' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = 'CLAUDE.md'
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-zinc-800"
                        title="Download as CLAUDE.md"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => setExpanded(expanded === file.id ? null : file.id)}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-zinc-800"
                      >
                        {expanded === file.id ? '↑' : '↓ View'}
                      </button>
                    </div>
                  </div>

                  {/* Preview snippet */}
                  {expanded !== file.id && (
                    <div className="px-5 pb-4">
                      <p className="text-xs text-zinc-600 font-mono truncate">
                        {file.content.split('\n').find((l) => l.trim()) ?? ''}
                      </p>
                    </div>
                  )}

                  {/* Expanded content */}
                  {expanded === file.id && (
                    <div className="border-t border-zinc-800 px-5 py-4">
                      <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                        {file.content}
                      </pre>
                      {file.score_json && (() => {
                        try {
                          const s = JSON.parse(file.score_json)
                          return s?.top_improvements?.length ? (
                            <div className="mt-4 pt-4 border-t border-zinc-800">
                              <p className="text-xs font-medium text-zinc-400 mb-2">Top improvements at time of scoring:</p>
                              <ul className="space-y-1">
                                {s.top_improvements.map((tip: string, i: number) => (
                                  <li key={i} className="text-xs text-zinc-500 flex gap-2">
                                    <span className="text-violet-500 flex-shrink-0">{i + 1}.</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null
                        } catch { return null }
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
