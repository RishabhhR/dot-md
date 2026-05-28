import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSON } from '@/lib/ai'
import {
  buildGuidedMessages,
  buildVoiceMessages,
  buildLinkedinMessages,
  suggestMessages,
} from '@/lib/prompts'
import type { BuildRequest } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body: BuildRequest = await req.json()
    const { mode } = body

    if (!mode) {
      return NextResponse.json({ error: 'mode is required.' }, { status: 400 })
    }

    let messages

    switch (mode) {
      case 'guided': {
        if (!body.answers || Object.keys(body.answers).length === 0) {
          return NextResponse.json({ error: 'answers required for guided mode.' }, { status: 400 })
        }
        messages = buildGuidedMessages(body.answers)
        break
      }
      case 'voice': {
        if (!body.transcript?.trim()) {
          return NextResponse.json({ error: 'transcript required for voice mode.' }, { status: 400 })
        }
        messages = buildVoiceMessages(body.transcript)
        break
      }
      case 'linkedin': {
        if (!body.linkedin_text?.trim()) {
          return NextResponse.json({ error: 'linkedin_text required for linkedin mode.' }, { status: 400 })
        }
        messages = buildLinkedinMessages(body.linkedin_text)
        break
      }
      case 'suggest': {
        if (!body.step) {
          return NextResponse.json({ error: 'step required for suggest mode.' }, { status: 400 })
        }
        messages = suggestMessages(body.step, body.answers || {})
        break
      }
      default:
        return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 })
    }

    const { content: raw, warning } = await callLLM(messages)
    const result = parseJSON<Record<string, unknown>>(raw, {})

    return NextResponse.json({ ...result, warning })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
