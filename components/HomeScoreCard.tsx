'use client'

import { useEffect, useRef, useState } from 'react'
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

function useCountUp(target: number, duration = 1200, delay = 100) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (target === 0) return
    timeoutRef.current = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp
        const elapsed = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate)
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [target, duration, delay])

  return value
}

function AnimatedBar({
  score,
  max,
  index,
}: {
  score: number
  max: number
  index: number
}) {
  const [width, setWidth] = useState(0)
  const targetPct = (score / max) * 100

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(targetPct)
    }, 200 + index * 100)
    return () => clearTimeout(timer)
  }, [targetPct, index])

  return (
    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${barColor(score, max)}`}
        style={{
          width: `${width}%`,
          transition: 'width 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      />
    </div>
  )
}

export function HomeScoreCard() {
  const [score, setScore] = useState<StoredScore | null>(null)
  const [isReal, setIsReal] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dotmd_last_score')
      if (raw) {
        const parsed = JSON.parse(raw) as StoredScore
        if (parsed?.overall) {
          setScore(parsed)
          setIsReal(true)
          // Small delay so card mounts before animation kicks
          setTimeout(() => setVisible(true), 50)
          return
        }
      }
    } catch { /* ignore */ }
    setScore(MOCK)
    setIsReal(false)
    setTimeout(() => setVisible(true), 50)
  }, [])

  const animatedScore = useCountUp(score?.overall ?? 0, 1200, 150)

  // Don't render during SSR — avoids hydration mismatch
  if (!score) return <div className="w-full max-w-sm h-72 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />

  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 500ms ease, transform 500ms ease',
      }}
    >
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
          <div className="text-5xl font-bold text-zinc-50 tabular-nums">{animatedScore}</div>
          <div className="text-zinc-500 text-sm mt-1">out of 100</div>
        </div>
        <div className="text-right">
          <span
            className={`inline-block border text-xs font-medium px-3 py-1 rounded-full ${gradeColors(score.grade)}`}
            style={{
              opacity: visible ? 1 : 0,
              transition: 'opacity 600ms ease 400ms',
            }}
          >
            {score.grade}
          </span>
          <div
            className="text-zinc-500 text-xs mt-2"
            style={{
              opacity: visible ? 1 : 0,
              transition: 'opacity 600ms ease 500ms',
            }}
          >
            {score.improvements} area{score.improvements !== 1 ? 's' : ''} to improve
          </div>
        </div>
      </div>

      {/* Dimension bars */}
      <div className="space-y-3">
        {score.dimensions.map((d, i) => (
          <div
            key={d.name}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-8px)',
              transition: `opacity 400ms ease ${300 + i * 80}ms, transform 400ms ease ${300 + i * 80}ms`,
            }}
          >
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400">{d.name}</span>
              <span className="text-zinc-500">{d.score}/{d.max}</span>
            </div>
            <AnimatedBar score={d.score} max={d.max} index={i} />
          </div>
        ))}
        <div
          className="text-zinc-600 text-xs pt-1"
          style={{
            opacity: visible ? 1 : 0,
            transition: `opacity 400ms ease ${300 + score.dimensions.length * 80}ms`,
          }}
        >
          + 4 more dimensions…
        </div>
      </div>

      {/* CTA when showing mock */}
      {!isReal && (
        <Link
          href="/score"
          className="mt-5 flex items-center justify-center w-full bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-violet-400 text-sm py-2.5 rounded-xl transition-colors"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 400ms ease 700ms',
          }}
        >
          Score your file →
        </Link>
      )}
    </div>
  )
}
