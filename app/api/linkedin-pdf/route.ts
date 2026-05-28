import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No PDF provided.' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF too large (max 10 MB).' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    // Import from lib path to avoid pdf-parse test-runner side-effect
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js')
    const data = await pdfParse(buffer)

    return NextResponse.json({ text: data.text ?? '' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
