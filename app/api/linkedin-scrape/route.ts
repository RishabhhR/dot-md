import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

function extractUsername(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/?#\s]+)/)
  return match ? match[1] : null
}

function stripHtml(html: string, maxChars = 8000): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxChars)
}

export async function POST(req: NextRequest) {
  try {
    const { li_at, profileUrl } = await req.json()

    if (!li_at?.trim() || !profileUrl?.trim()) {
      return NextResponse.json(
        { error: 'Both li_at cookie and profile URL are required.' },
        { status: 400 },
      )
    }

    const username = extractUsername(profileUrl)
    if (!username) {
      return NextResponse.json(
        { error: 'Invalid LinkedIn profile URL. Expected format: linkedin.com/in/your-username' },
        { status: 400 },
      )
    }

    const headers: HeadersInit = {
      Cookie: `li_at=${li_at.trim()}`,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    }

    const profileRes = await fetch(`https://www.linkedin.com/in/${username}/`, { headers })

    if (profileRes.status === 999 || profileRes.status === 429) {
      return NextResponse.json(
        { error: 'LinkedIn blocked the request. Try the PDF or paste methods instead.' },
        { status: 400 },
      )
    }

    const profileHtml = await profileRes.text()

    // Cookie expired / invalid → LinkedIn redirects to login
    if (
      profileHtml.includes('uas/login') ||
      profileHtml.includes('authwall') ||
      profileHtml.includes('Join LinkedIn') ||
      profileHtml.includes('Sign in')
    ) {
      return NextResponse.json(
        { error: 'Cookie appears expired or invalid. Open LinkedIn, copy a fresh li_at value, and try again.' },
        { status: 401 },
      )
    }

    const profileText = stripHtml(profileHtml, 8000)

    // Fetch recent posts (best-effort)
    let postsText = ''
    try {
      const postsRes = await fetch(
        `https://www.linkedin.com/in/${username}/recent-activity/all/`,
        { headers },
      )
      if (postsRes.ok) {
        postsText = stripHtml(await postsRes.text(), 4000)
      }
    } catch {
      // posts are optional — don't fail
    }

    return NextResponse.json({ profileText, postsText })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
