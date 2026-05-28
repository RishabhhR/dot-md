import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { initDb, upsertUser, saveMdFile, getUserHistory } from '@/lib/db'

export const maxDuration = 30

// GET /api/history — fetch the signed-in user's file history
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await initDb()
    const files = await getUserHistory(userId)

    return NextResponse.json({ files })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/history — save a new MD file entry
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { content, overall_score, grade, score_json, source, label } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    await initDb()

    // Upsert user record (pull latest name/email from Clerk)
    const clerkUser = await currentUser()
    await upsertUser({
      id: userId,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress ?? '',
      name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' '),
    })

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
