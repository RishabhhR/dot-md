import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSON } from '@/lib/ai'
import { scoreMessages } from '@/lib/prompts'
import type { ScoreResult } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()
    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return NextResponse.json({ error: 'Content is required (min 10 chars).' }, { status: 400 })
    }

    const { content: raw, warning } = await callLLM(scoreMessages(content))

    const fallback: ScoreResult = {
      overall: 0,
      grade: 'Beginner',
      summary: 'Could not analyze the file. Please try again.',
      top_improvements: [],
      dimensions: [],
    }

    const result = parseJSON<ScoreResult>(raw, fallback)

    // Recalculate overall as sum of dimension scores for accuracy
    if (result.dimensions?.length) {
      result.overall = result.dimensions.reduce((sum, d) => sum + (d.score || 0), 0)
    }

    // Derive grade from overall
    if (result.overall >= 86) result.grade = 'Expert'
    else if (result.overall >= 66) result.grade = 'Proficient'
    else if (result.overall >= 41) result.grade = 'Functional'
    else result.grade = 'Beginner'

    return NextResponse.json({ ...result, warning })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
