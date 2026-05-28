import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSON } from '@/lib/ai'
import { optimizeMessages } from '@/lib/prompts'
import type { OptimizeResult } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()
    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return NextResponse.json({ error: 'Content is required (min 10 chars).' }, { status: 400 })
    }

    const { content: raw, warning } = await callLLM(optimizeMessages(content))

    const fallback: OptimizeResult = {
      markdown: content,
      changes: [],
      score_before: 0,
      score_after: 0,
    }

    const result = parseJSON<OptimizeResult>(raw, fallback)

    return NextResponse.json({ ...result, warning })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
