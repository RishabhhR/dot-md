import Link from 'next/link'

const MOCK_DIMENSIONS = [
  { name: 'Identity & Role', score: 8, max: 10 },
  { name: 'Technical Context', score: 11, max: 15 },
  { name: 'Communication Style', score: 6, max: 15 },
  { name: 'Constraints & Boundaries', score: 2, max: 10 },
]

function MockScoreCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-5xl font-bold text-zinc-50">72</div>
          <div className="text-zinc-500 text-sm mt-1">out of 100</div>
        </div>
        <div className="text-right">
          <span className="inline-block bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium px-3 py-1 rounded-full">
            Proficient
          </span>
          <div className="text-zinc-500 text-xs mt-2">3 areas to improve</div>
        </div>
      </div>
      <div className="space-y-3">
        {MOCK_DIMENSIONS.map((d) => {
          const pct = d.score / d.max
          const barColor =
            pct >= 0.86 ? 'bg-emerald-500' : pct >= 0.66 ? 'bg-violet-500' : pct >= 0.41 ? 'bg-amber-500' : 'bg-red-500'
          return (
            <div key={d.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400">{d.name}</span>
                <span className="text-zinc-500">
                  {d.score}/{d.max}
                </span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </div>
          )
        })}
        <div className="text-zinc-600 text-xs pt-1">+ 4 more dimensions…</div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Nav */}
      <nav className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm font-semibold text-violet-400 tracking-wide">Contextual Labs</span>
          <div className="flex items-center gap-6">
            <Link href="/score" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
              Score
            </Link>
            <Link href="/build" className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors">
              Build
            </Link>
            <Link
              href="/score"
              className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs text-violet-400 mb-8">
              The future of AI productivity starts with context
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
              Your{' '}
              <span className="text-violet-400">.md file</span>
              <br />
              is your resume.
            </h1>
            <p className="text-lg text-zinc-400 max-w-xl mb-10 leading-relaxed">
              Most people are leaving 70% of AI productivity on the table. Score your context file, build one
              from scratch, or let AI optimize what you have.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/score"
                className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-medium transition-colors text-center"
              >
                Score My File
              </Link>
              <Link
                href="/build"
                className="border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-zinc-50 px-6 py-3 rounded-xl font-medium transition-colors text-center"
              >
                Build From Scratch
              </Link>
            </div>
          </div>
          <div className="flex-shrink-0">
            <MockScoreCard />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-zinc-900">
        <h2 className="text-2xl font-semibold text-center mb-3">Three tools, one goal</h2>
        <p className="text-zinc-400 text-center mb-12 max-w-lg mx-auto">
          Whether you have an existing file or are starting from zero, Contextual Labs meets you where you are.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '◎',
              title: 'Score',
              href: '/score',
              desc: 'Paste your CLAUDE.md or skill file. Get a detailed breakdown across 8 dimensions — identity, tech stack, communication style, constraints, and more.',
              cta: 'Score my file →',
              color: 'text-violet-400',
            },
            {
              icon: '+',
              title: 'Build',
              href: '/build',
              desc: "Answer 8 guided questions, speak for 2 minutes, or paste your LinkedIn profile. We'll generate a complete, high-quality context file for you.",
              cta: 'Build my file →',
              color: 'text-emerald-400',
            },
            {
              icon: '↑',
              title: 'Optimize',
              href: '/score',
              desc: 'Already have a file? Paste it and AI will refine every section — filling gaps, making vague statements specific, and showing exactly what changed.',
              cta: 'Optimize my file →',
              color: 'text-amber-400',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors"
            >
              <div className={`text-2xl font-bold mb-4 ${f.color}`}>{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-5">{f.desc}</p>
              <Link href={f.href} className={`text-sm font-medium ${f.color} hover:opacity-80 transition-opacity`}>
                {f.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-zinc-900">
        <h2 className="text-2xl font-semibold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Paste, speak, or import',
              desc: 'Drop in your existing context file, talk for 2 minutes, or paste your LinkedIn profile text.',
            },
            {
              step: '02',
              title: 'Get scored across 8 dimensions',
              desc: 'AI analyzes your file and returns a detailed breakdown — what works, what\'s missing, and why it matters.',
            },
            {
              step: '03',
              title: 'Download your optimized file',
              desc: 'One click to optimize and download a refined .md file ready to drop into Claude, Cursor, or any AI tool.',
            },
          ].map((s) => (
            <div key={s.step} className="flex gap-5">
              <div className="text-3xl font-bold text-zinc-800 font-mono flex-shrink-0">{s.step}</div>
              <div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Input modes callout */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-zinc-900">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-3">No .md file? No problem.</h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto text-sm leading-relaxed">
            Don&apos;t have a context file yet? You have three ways to create one — pick whatever feels natural.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {[
              { icon: '🎙', label: 'Talk for 2 minutes', desc: 'Describe yourself out loud' },
              { icon: '💼', label: 'Paste LinkedIn', desc: 'Copy your profile text' },
              { icon: '✏️', label: 'Guided questions', desc: '8 simple questions' },
            ].map((m) => (
              <Link
                key={m.label}
                href="/build"
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-xl p-4 transition-colors text-left"
              >
                <div className="text-xl mb-2">{m.icon}</div>
                <div className="text-sm font-medium">{m.label}</div>
                <div className="text-zinc-500 text-xs mt-1">{m.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-zinc-600 text-sm">
          <span className="text-violet-400/60 font-medium">Contextual Labs</span>
          <span>Nothing is stored. Privacy first.</span>
        </div>
      </footer>
    </div>
  )
}
