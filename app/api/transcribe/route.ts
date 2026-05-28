import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured.' }, { status: 500 })
    }

    const formData = await req.formData()
    const audio = formData.get('audio') as File | null

    if (!audio || audio.size === 0) {
      return NextResponse.json({ error: 'No audio provided.' }, { status: 400 })
    }

    if (audio.size > 24 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file too large (max 24 MB).' }, { status: 400 })
    }

    const groqForm = new FormData()
    groqForm.append('file', audio, audio.name || 'recording.webm')
    groqForm.append('model', 'whisper-large-v3-turbo')
    groqForm.append('response_format', 'json')
    groqForm.append('language', 'en')

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    })

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { error: `Groq Whisper error (HTTP ${res.status}): ${body.slice(0, 200)}` },
        { status: 500 },
      )
    }

    const data = await res.json()
    return NextResponse.json({ transcript: data.text ?? '' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
