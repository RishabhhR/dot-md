import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSON } from '@/lib/ai'
import { chatGptFormatMessages } from '@/lib/prompts'

export const maxDuration = 30

interface ChatGptResult {
  about: string
  respond: string
}

export async function POST(req: NextRequest) {
  try {
    const { content, tool } = await req.json()

    if (!content || typeof content !== 'string' || content.trim().length < 20) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    if (tool === 'chatgpt') {
      const { content: raw } = await callLLM(chatGptFormatMessages(content))

      const fallback: ChatGptResult = {
        about: content.slice(0, 750),
        respond: '',
      }
      const result = parseJSON<ChatGptResult>(raw, fallback)

      // Hard-enforce char limits
      result.about = (result.about ?? '').slice(0, 750)
      result.respond = (result.respond ?? '').slice(0, 750)

      return NextResponse.json({
        tool: 'chatgpt',
        about: result.about,
        respond: result.respond,
        charCount: result.about.length + result.respond.length,
      })
    }

    return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
