import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import {
  initDb, upsertUser,
  saveMdFile, getUserHistory,
  saveTestResult, updateTestRating, getUserTestResults,
} from '@/lib/db'

export const maxDuration = 30

// GET /api/history — fetch the signed-in user's file history + test results
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await initDb()
    const [files, tests] = await Promise.all([
      getUserHistory(userId),
      getUserTestResults(userId),
    ])

    return NextResponse.json({ files, tests })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/history — save a new MD file entry OR a test result OR rate a test
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    await initDb()

    // ── Rate an existing test result ──────────────────────────────────
    if (body.type === 'rate_test') {
      const { test_id, rating } = body
      if (!test_id || typeof rating !== 'number') {
        return NextResponse.json({ error: 'test_id and rating required' }, { status: 400 })
      }
      await updateTestRating(test_id, userId, rating)
      return NextResponse.json({ ok: true })
    }

    // Upsert user record (pull latest name/email from Clerk) for all writes
    const clerkUser = await currentUser()
    await upsertUser({
      id: userId,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress ?? '',
      name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' '),
    })

    // ── Save a test result ────────────────────────────────────────────
    if (body.type === 'test') {
      const { prompt, task_label, detected_domain, response_generic, response_with_ctx, rating } = body
      if (!prompt || !response_generic || !response_with_ctx) {
        return NextResponse.json({ error: 'prompt, response_generic, response_with_ctx required' }, { status: 400 })
      }
      const id = await saveTestResult({
        userId,
        prompt,
        taskLabel: task_label,
        detectedDomain: detected_domain,
        responseGeneric: response_generic,
        responseWithCtx: response_with_ctx,
        rating,
      })
      return NextResponse.json({ id })
    }

    // ── Save an MD file entry (default) ──────────────────────────────
    const { content, overall_score, grade, score_json, source, label } = body
    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const id = await saveMdFile({
      userId,
      content,
      overallScore: overall_score,
      grade,
      scoreJson: score_json ? JSON.stringify(score_json) : undefined,
      source: source ?? 'unknown',
      label,
    })

    return NextResponse.json({ id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
