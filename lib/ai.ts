const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export type Message = { role: 'system' | 'user' | 'assistant'; content: string }

interface LLMResult {
  offline: boolean
  content: string
  warning?: string
}

async function callGroq(messages: Message[], timeoutMs = 25000): Promise<LLMResult> {
  const apiKey = process.env.GROQ_API_KEY
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  if (!apiKey) return { offline: true, content: '' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 4096,
      }),
    })
    clearTimeout(timer)
    if (!res.ok) return { offline: true, content: '', warning: `Groq HTTP ${res.status}` }
    const data = await res.json()
    return { offline: false, content: data.choices[0].message.content }
  } catch {
    clearTimeout(timer)
    return { offline: true, content: '', warning: 'Groq request failed or timed out' }
  }
}

async function callGemini(systemPrompt: string, userPrompt: string, timeoutMs = 25000): Promise<LLMResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { offline: true, content: '', warning: 'GEMINI_API_KEY not set' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    })
    clearTimeout(timer)
    if (!res.ok) return { offline: true, content: '', warning: `Gemini HTTP ${res.status}` }
    const data = await res.json()
    const content = data.candidates[0].content.parts[0].text
    return { offline: false, content }
  } catch {
    clearTimeout(timer)
    return { offline: true, content: '', warning: 'Gemini request failed or timed out' }
  }
}

async function callOpenRouter(messages: Message[], timeoutMs = 25000): Promise<LLMResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return { offline: true, content: '', warning: 'OPENROUTER_API_KEY not set' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct',
        messages,
        temperature: 0.2,
      }),
    })
    clearTimeout(timer)
    if (!res.ok) return { offline: true, content: '', warning: `OpenRouter HTTP ${res.status}` }
    const data = await res.json()
    return { offline: false, content: data.choices[0].message.content }
  } catch {
    clearTimeout(timer)
    return { offline: true, content: '', warning: 'OpenRouter request failed or timed out' }
  }
}

export async function callLLM(messages: Message[]): Promise<{ content: string; provider: string; warning?: string }> {
  const groq = await callGroq(messages)
  if (!groq.offline) return { content: groq.content, provider: 'groq' }

  const systemPrompt = messages.find(m => m.role === 'system')?.content || ''
  const userPrompt = messages.find(m => m.role === 'user')?.content || ''
  const gemini = await callGemini(systemPrompt, userPrompt)
  if (!gemini.offline) return { content: gemini.content, provider: 'gemini', warning: 'Used Gemini fallback' }

  const or = await callOpenRouter(messages)
  if (!or.offline) return { content: or.content, provider: 'openrouter', warning: 'Used OpenRouter fallback' }

  throw new Error('All LLM providers are unavailable. Check your API keys.')
}

// Free-form (non-JSON) call — for the A/B test responses
// systemPrompt = null → no system message (generic mode)
// systemPrompt = string → CLAUDE.md as system (contextualized mode)
export async function callGroqFreeform(
  systemPrompt: string | null,
  userPrompt: string,
  timeoutMs = 30000
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  if (!apiKey) throw new Error('GROQ_API_KEY not set')

  const messages: Message[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: userPrompt })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 800 }),
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`)
    const data = await res.json()
    return data.choices[0].message.content as string
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

export function parseJSON<T>(content: string, fallback: T): T {
  try {
    return JSON.parse(content) as T
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) as T } catch { /* fall through */ }
    }
    return fallback
  }
}
