import { NextRequest, NextResponse } from 'next/server'
import { initDb, getPublicProfile } from '@/lib/db'

export const maxDuration = 15

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 })

    await initDb()
    const profile = await getPublicProfile(username.toLowerCase())

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
