import { NextRequest, NextResponse } from 'next/server'
import { callGroqFreeform } from '@/lib/ai'

export const maxDuration = 60

export interface TestResult {
  generic: string
  contextualized: string
}

export async function POST(req: NextRequest) {
  try {
    const { content, prompt } = await req.json()

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return NextResponse.json({ error: 'prompt is required (min 5 chars)' }, { status: 400 })
    }
    if (!content || typeof content !== 'string' || content.trim().length < 20) {
      return NextResponse.json({ error: 'content (context file) is required' }, { status: 400 })
    }

    // Run both calls in parallel:
    // - Generic: no system prompt at all (pure AI with no context)
    // - Contextualized: user's CLAUDE.md as the system prompt
    const [generic, contextualized] = await Promise.all([
      callGroqFreeform(null, prompt),
      callGroqFreeform(content.slice(0, 8000), prompt),
    ])

    return NextResponse.json({ generic, contextualized } satisfies TestResult)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
