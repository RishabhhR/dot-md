import { NextRequest, NextResponse } from 'next/server'
import { callLLM, parseJSON } from '@/lib/ai'
import { detectDomainMessages } from '@/lib/prompts'

export const maxDuration = 30

export interface DomainResult {
  domain: string
  description: string
  prompts: { label: string; prompt: string }[]
}

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()
    if (!content || typeof content !== 'string' || content.trim().length < 20) {
      return NextResponse.json({ error: 'content is required (min 20 chars)' }, { status: 400 })
    }

    const { content: raw } = await callLLM(detectDomainMessages(content))

    const fallback: DomainResult = {
      domain: 'Professional',
      description: 'A skilled professional with a unique perspective.',
      prompts: [
        { label: 'LinkedIn post', prompt: 'Write a LinkedIn post sharing my perspective on the most important skill in my field.' },
        { label: 'Professional bio', prompt: 'Write a short professional bio I can use on my portfolio or website.' },
        { label: 'Cold email', prompt: 'Draft a concise cold email introducing myself to a potential collaborator in my industry.' },
        { label: 'Thought piece', prompt: 'Write a short opinion piece on the biggest misconception people have about my work.' },
      ],
    }

    const result = parseJSON<DomainResult>(raw, fallback)

    // Ensure exactly 4 prompts
    if (!result.prompts || result.prompts.length === 0) {
      result.prompts = fallback.prompts
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
