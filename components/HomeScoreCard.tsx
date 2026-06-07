'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Lottie must be client-only (no SSR)
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })
import scoreRingAnim from '../public/animations/score-ring.json'

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
    { name: 'Identity & Role',        score: 8,  max: 10 },
    { name: 'Technical Context',      score: 11, max: 15 },
    { name: 'Communication Style',    score: 6,  max: 15 },
    { name: 'Constraints & Limits',   score: 2,  max: 10 },
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

function useCountUp(target: number, duration = 1000, delay = 200) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!target) return
    timerRef.current = setTimeout(() => {
      const tick = (ts: number) => {
        if (!startRef.current) startRef.current = ts
        const t = Math.min((ts - startRef.current) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        setValue(Math.round(eased * target))
        if (t < 1) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }, delay)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [target, duration, delay])

  return value
}

function AnimatedBar({ score, max, index, visible }: { score: number; max: number; index: number; visible: boolean }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setWidth((score / max) * 100), 350 + index * 110)
    return () => clearTimeout(t)
  }, [visible, score, max, index])

  return (
    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${barColor(score, max)}`}
        style={{ width: `${width}%`, transition: 'width 900ms cubic-bezier(0.25,0.46,0.45,0.94)' }}
      />
    </div>
  )
}

export function HomeScoreCard() {
  const [score, setScore] = useState<StoredScore | null>(null)
  const [isReal, setIsReal] = useState(false)
  const [visible, setVisible] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lottieRef = useRef<any>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dotmd_last_score')
      if (raw) {
        const parsed = JSON.parse(raw) as StoredScore
        if (parsed?.overall) { setScore(parsed); setIsReal(true); setTimeout(() => setVisible(true), 80); return }
      }
    } catch { /* ignore */ }
    setScore(MOCK)
    setIsReal(false)
    setTimeout(() => setVisible(true), 80)
  }, [])

  // Fire Lottie animation once visible
  useEffect(() => {
    if (visible && score && lottieRef.current) {
      // playSegments([start, end], forceFlag)
      // 100 frames = 100%, so frame == score percentage
      lottieRef.current.playSegments([0, score.overall], true)
    }
  }, [visible, score])

  const displayScore = useCountUp(score?.overall ?? 0, 1000, 250)

  if (!score) {
    return <div className="w-full max-w-sm h-96 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
  }

  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(14px)',
        transition: 'opacity 500ms ease, transform 500ms ease',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Circular gauge + grade badge */}
      <div className="flex items-center gap-4 mb-6">
        {/* Lottie ring with score inside */}
        <div className="relative shrink-0 w-[120px] h-[120px]">
          <Lottie
            lottieRef={lottieRef}
            animationData={scoreRingAnim}
            autoplay={false}
            loop={false}
            style={{ width: 120, height: 120 }}
          />
          {/* Score overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold text-zinc-50 tabular-nums leading-none">{displayScore}</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">out of 100</span>
          </div>
        </div>

        {/* Grade + improvements */}
        <div
          className="flex flex-col gap-2"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 500ms ease 400ms' }}
        >
          <span className={`inline-block self-start border text-xs font-semibold px-3 py-1 rounded-full ${gradeColors(score.grade)}`}>
            {score.grade}
          </span>
          <p className="text-zinc-500 text-xs leading-snug">
            {score.improvements} area{score.improvements !== 1 ? 's' : ''} to improve
          </p>
          <p className="text-zinc-600 text-[10px]">across 8 dimensions</p>
        </div>
      </div>

      {/* Dimension bars */}
      <div className="space-y-3">
        {score.dimensions.map((d, i) => (
          <div
            key={d.name}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-6px)',
              transition: `opacity 350ms ease ${300 + i * 90}ms, transform 350ms ease ${300 + i * 90}ms`,
            }}
          >
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-zinc-400">{d.name}</span>
              <span className="text-zinc-500 tabular-nums">{d.score}/{d.max}</span>
            </div>
            <AnimatedBar score={d.score} max={d.max} index={i} visible={visible} />
          </div>
        ))}

        <p
          className="text-zinc-600 text-xs pt-0.5"
          style={{ opacity: visible ? 1 : 0, transition: `opacity 350ms ease ${300 + score.dimensions.length * 90}ms` }}
        >
          + 4 more dimensions…
        </p>
      </div>

      {/* CTA (only for example data) */}
      {!isReal && (
        <Link
          href="/score"
          className="mt-5 flex items-center justify-center w-full bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-violet-400 text-sm font-medium py-2.5 rounded-xl transition-colors"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 400ms ease 700ms' }}
        >
          Score your file →
        </Link>
      )}
    </div>
  )
}
