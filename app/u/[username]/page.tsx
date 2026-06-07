'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

interface ScoreDim { name: string; score: number; max: number }

interface PublicProfile {
  user: { name: string; username: string; created_at: number }
  bestFile: { overall_score: number; grade: string; score_json: string | null; created_at: number } | null
  domain: string | null
  totalFiles: number
  totalTests: number
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
}

function gradeColor(grade: string) {
  switch (grade) {
    case 'Expert':     return { text: 'text-emerald-400', badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', bar: 'bg-emerald-500' }
    case 'Proficient': return { text: 'text-violet-400',  badge: 'bg-violet-500/10 border-violet-500/20 text-violet-400',  bar: 'bg-violet-500' }
    case 'Functional': return { text: 'text-amber-400',   badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400',   bar: 'bg-amber-500' }
    default:           return { text: 'text-red-400',     badge: 'bg-red-500/10 border-red-500/20 text-red-400',     bar: 'bg-red-500' }
  }
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/profile/${username}`)
      .then(r => { if (r.status === 404) { setNotFound(true); return null } return r.json() })
      .then(d => { if (d) setProfile(d) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [username])

  const scoreJson: { dimensions?: ScoreDim[]; summary?: string } | null = (() => {
    try { return profile?.bestFile?.score_json ? JSON.parse(profile.bestFile.score_json) : null }
    catch { return null }
  })()

  const dims = scoreJson?.dimensions?.slice(0, 4) ?? []
  const grade = profile?.bestFile?.grade ?? 'Beginner'
  const colors = gradeColor(grade)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Minimal nav */}
      <div className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="flex items-center gap-2 w-fit group">
            <Logo size={24} />
            <span className="text-xs font-semibold text-violet-400 tracking-wide group-hover:text-violet-300 transition-colors">DotMD</span>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-4">

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {notFound && !loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <h1 className="text-xl font-bold mb-2">Profile not found</h1>
            <p className="text-zinc-400 text-sm mb-6">@{username} hasn&apos;t set up their profile yet.</p>
            <Link href="/" className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Create yours →
            </Link>
          </div>
        )}

        {profile && !loading && (
          <>
            {/* Profile header */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
                  {initials(profile.user.name || username)}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-zinc-50">{profile.user.name || username}</h1>
                  <p className="text-sm text-zinc-400">@{profile.user.username}</p>
                  {profile.domain && (
                    <div className="mt-2">
                      <span className="text-xs bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2.5 py-1 rounded-full">
                        {profile.domain}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-zinc-600 mt-2">Member since {formatDate(profile.user.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Score card */}
            {profile.bestFile ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">Context File Score</p>
                    <div className="flex items-center gap-3">
                      <span className={`text-5xl font-bold ${colors.text}`}>{profile.bestFile.overall_score}</span>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${colors.badge}`}>{grade}</span>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600">out of 100</span>
                </div>

                {/* Main bar */}
                <div className="h-2 bg-zinc-800 rounded-full mb-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${colors.bar}`}
                    style={{ width: `${profile.bestFile.overall_score}%` }}
                  />
                </div>

                {/* Dimension mini-bars */}
                {dims.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {dims.map((d) => (
                      <div key={d.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-zinc-400 truncate">{d.name}</span>
                          <span className="text-xs text-zinc-500 flex-shrink-0 ml-2">{d.score}/{d.max}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${(d.score / d.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
                <p className="text-zinc-500 text-sm">No scored context file yet</p>
              </div>
            )}

            {/* Stats */}
            {(profile.totalFiles > 0 || profile.totalTests > 0) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="text-2xl font-bold text-zinc-50">{profile.totalFiles}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Context files</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="text-2xl font-bold text-zinc-50">{profile.totalTests}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">AI tests run</div>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-6 text-center">
              <h2 className="font-bold text-zinc-50 mb-1">Want a score like this?</h2>
              <p className="text-sm text-zinc-400 mb-5">Build and score your own AI context file in minutes — it&apos;s free.</p>
              <Link
                href="/"
                className="inline-block bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Get my score →
              </Link>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-zinc-700 pb-8">
              Powered by{' '}
              <Link href="/" className="text-zinc-600 hover:text-zinc-400 transition-colors">
                DotMD
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
