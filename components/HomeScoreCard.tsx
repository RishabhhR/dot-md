'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface StoredScore {
  overall: number
  grade: string
  dimensions: { name: string; score: number; max: number }[]
  improvements: number
}

const MOCK: StoredScore = {
  overall: 72,
  grade: 'Proficient',
  dimensions: [
    { name: 'Identity & Role', score: 8, max: 10 },
    { name: 'Technical Context', score: 11, max: 15 },
    { name: 'Communication Style', score: 6, max: 15 },
    { name: 'Constraints & Boundaries', score: 2, max: 10 },
  ],
  improvements: 3,
}

function gradeColors(grade: string) {
  switch (grade) {
    case 'Expert':    return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    case 'Proficient':return 'bg-violet-500/10 border-violet-500/20 text-violet-400'
    case 'Functional':return 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    default:          return 'bg-red-500/10 border-red-500/20 text-red-400'
  }
}

function barColor(score: number, max: number) {
  const pct = score / max
  if (pct >= 0.86) return 'bg-emerald-500'
  if (pct >= 0.66) return 'bg-violet-500'
  if (pct >= 0.41) return 'bg-amber-500'
  return 'bg-red-500'
}

export function HomeScoreCard() {
  const [score, setScore] = useState<StoredScore | null>(null)
  const [isReal, setIsReal] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('contextual_labs_last_score')
      if (raw) {
        const parsed = JSON.parse(raw) as StoredScore
        if (parsed?.overall) {
          setScore(parsed)
          setIsReal(true)
          return
        }
      }
    } catch { /* ignore */ }
    setScore(MOCK)
    setIsReal(false)
  }, [])

  // Don't render during SSR — avoids hydration mismatch
  if (!score) return <div className="w-full max-w-sm h-72 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm">
      {/* Top label */}
      <div className="flex items-center justify-between mb-5">
        {isReal ? (
          <>
            <span className="text-xs text-zinc-400 font-medium">Your last score</span>
            <Link href="/score?restore=1" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Continue →
            </Link>
          </>
        ) : (
          <span className="text-xs text-zinc-600 bg-zinc-800 px-2.5 py-1 rounded-full">Example</span>
        )}
      </div>

      {/* Score + grade */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-5xl font-bold text-zinc-50">{score.overall}</div>
          <div className="text-zinc-500 text-sm mt-1">out of 100</div>
        </div>
        <div className="text-right">
          <span className={`inline-block border text-xs font-medium px-3 py-1 rounded-full ${gradeColors(score.grade)}`}>
            {score.grade}
          </span>
          <div className="text-zinc-500 text-xs mt-2">
            {score.improvements} area{score.improvements !== 1 ? 's' : ''} to improve
          </div>
        </div>
      </div>

      {/* Dimension bars */}
      <div className="space-y-3">
        {score.dimensions.map((d) => (
          <div key={d.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400">{d.name}</span>
              <span className="text-zinc-500">{d.score}/{d.max}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor(d.score, d.max)}`}
                style={{ width: `${(d.score / d.max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <div className="text-zinc-600 text-xs pt-1">+ 4 more dimensions…</div>
      </div>

      {/* CTA when showing mock */}
      {!isReal && (
        <Link
          href="/score"
          className="mt-5 flex items-center justify-center w-full bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-violet-400 text-sm py-2.5 rounded-xl transition-colors"
        >
          Score your file →
        </Link>
      )}
    </div>
  )
}
