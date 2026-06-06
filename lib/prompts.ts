import type { Message } from './ai'

export function scoreMessages(content: string): Message[] {
  return [
    {
      role: 'system',
      content:
        'You are an expert evaluator of AI context files (CLAUDE.md, skill files, system prompts). ' +
        'Score the provided file across 8 dimensions. Return ONLY valid JSON — no markdown, no explanation outside the JSON object.',
    },
    {
      role: 'user',
      content: `Score this AI context/skill file:

<file>
${content.slice(0, 8000)}
</file>

Return this exact JSON structure (overall must equal the sum of all dimension scores):
{
  "overall": <integer 0-100>,
  "grade": "Beginner" | "Functional" | "Proficient" | "Expert",
  "summary": "<2-3 sentences assessing overall quality and what kind of professional wrote this>",
  "top_improvements": ["<most impactful improvement>", "<second>", "<third>"],
  "dimensions": [
    {"name": "Identity & Role",        "score": <0-10>,  "max": 10,  "feedback": "<1-2 sentences>", "suggestions": ["<specific action>", "<specific action>"]},
    {"name": "Technical Context",      "score": <0-15>,  "max": 15,  "feedback": "<1-2 sentences>", "suggestions": ["<specific action>", "<specific action>"]},
    {"name": "Communication Style",    "score": <0-15>,  "max": 15,  "feedback": "<1-2 sentences>", "suggestions": ["<specific action>", "<specific action>"]},
    {"name": "Work Patterns",          "score": <0-15>,  "max": 15,  "feedback": "<1-2 sentences>", "suggestions": ["<specific action>", "<specific action>"]},
    {"name": "Domain Expertise",       "score": <0-15>,  "max": 15,  "feedback": "<1-2 sentences>", "suggestions": ["<specific action>", "<specific action>"]},
    {"name": "Constraints & Boundaries","score": <0-10>, "max": 10,  "feedback": "<1-2 sentences>", "suggestions": ["<specific action>", "<specific action>"]},
    {"name": "Goals & Priorities",     "score": <0-10>,  "max": 10,  "feedback": "<1-2 sentences>", "suggestions": ["<specific action>", "<specific action>"]},
    {"name": "Collaboration Style",    "score": <0-10>,  "max": 10,  "feedback": "<1-2 sentences>", "suggestions": ["<specific action>", "<specific action>"]},
  ]
}

Grading bands: 0-40=Beginner, 41-65=Functional, 66-85=Proficient, 86-100=Expert.
Be specific and actionable. Empty/missing sections score 0. Vague content scores low.`,
    },
  ]
}

export function buildGuidedMessages(answers: Record<string, string>): Message[] {
  const answersText = Object.entries(answers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n\n')

  return [
    {
      role: 'system',
      content:
        'You are an expert at writing AI context files (CLAUDE.md, skill files) that maximize AI productivity. ' +
        'Generate a well-structured, highly specific context file in markdown. Return ONLY valid JSON.',
    },
    {
      role: 'user',
      content: `Based on these answers, generate a comprehensive CLAUDE.md context file:

${answersText}

Guidelines:
- Use clear markdown headings for each section
- Be specific, not generic — use the exact details the person provided
- Include all sections even if answers were brief (fill intelligently)
- Write in first person as the user
- Keep it practical and actionable for an AI assistant

Return JSON:
{"markdown": "<complete markdown file content>"}`,
    },
  ]
}

export function buildVoiceMessages(transcript: string): Message[] {
  return [
    {
      role: 'system',
      content:
        'You are an expert at writing AI context files (CLAUDE.md) from conversational input. ' +
        'Extract key information and generate a well-structured context file. Return ONLY valid JSON.',
    },
    {
      role: 'user',
      content: `Convert this voice transcript into a comprehensive CLAUDE.md context file:

<transcript>
${transcript.slice(0, 6000)}
</transcript>

Extract: role, tech stack, communication preferences, work patterns, expertise, constraints, goals.
Fill gaps intelligently based on context clues. Use markdown headers.

Return JSON:
{"markdown": "<complete markdown file content>"}`,
    },
  ]
}

export interface LinkedInData {
  pasteText?: string
  pdfText?: string
  scrapedProfile?: string
  scrapedPosts?: string
}

export function buildLinkedinMessages(data: LinkedInData | string): Message[] {
  // Accept legacy string or new object
  let context = ''
  let hasPosts = false

  if (typeof data === 'string') {
    context = `<linkedin_data>\n${data.slice(0, 6000)}\n</linkedin_data>`
  } else {
    const parts: string[] = []
    if (data.pasteText?.trim())
      parts.push(`<pasted_text>\n${data.pasteText.slice(0, 4000)}\n</pasted_text>`)
    if (data.pdfText?.trim())
      parts.push(`<pdf_profile>\n${data.pdfText.slice(0, 5000)}\n</pdf_profile>`)
    if (data.scrapedProfile?.trim())
      parts.push(`<scraped_profile>\n${data.scrapedProfile.slice(0, 4000)}\n</scraped_profile>`)
    if (data.scrapedPosts?.trim()) {
      parts.push(`<recent_posts>\n${data.scrapedPosts.slice(0, 3000)}\n</recent_posts>`)
      hasPosts = true
    }
    context = parts.join('\n\n')
  }

  return [
    {
      role: 'system',
      content:
        'You are an expert at writing AI context files (CLAUDE.md) from LinkedIn profiles. ' +
        'Extract professional context and generate a well-structured context file. Return ONLY valid JSON.',
    },
    {
      role: 'user',
      content: `Convert this LinkedIn data into a comprehensive CLAUDE.md context file:

${context}

Extract: role, tech stack, domain expertise, industry context, seniority level.
Infer communication preferences and work patterns from the career trajectory.${
        hasPosts
          ? '\nUse the recent posts to infer their writing voice, preferred tone, and communication style — reflect this in the Communication Style section.'
          : ''
      }
Add placeholder sections with clear instructions for the user to fill in constraints and collaboration preferences.

Return JSON:
{"markdown": "<complete markdown file content>"}`,
    },
  ]
}

export function suggestMessages(step: string, answers: Record<string, string>): Message[] {
  const context = Object.entries(answers)
    .filter(([k]) => k !== step)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n\n')

  const stepDescriptions: Record<string, string> = {
    role: 'professional role, title, company type, and years of experience',
    tech_stack: 'programming languages, frameworks, tools, databases, and infrastructure',
    communication: 'response format preferences, verbosity level, and tone',
    work_patterns: 'how they approach tasks, what they delegate to AI, and their workflow',
    expertise: 'deep knowledge areas and technical specializations',
    constraints: 'things AI should never do, pet peeves, and hard rules',
    goals: 'what good output looks like and what priorities matter most',
    collaboration: 'how proactive to be, when to ask vs assume, and how to handle uncertainty',
  }

  return [
    {
      role: 'system',
      content:
        'You are an expert at writing AI context files. Generate a natural, specific suggestion for one section. Return ONLY valid JSON.',
    },
    {
      role: 'user',
      content: `Generate a suggestion for the "${step}" section of an AI context file.

This section covers: ${stepDescriptions[step] || step}

Context from other sections already filled in:
${context || 'None yet — this is the first section.'}

Write a natural, first-person paragraph (2-4 sentences) that would be a good answer for this section.
Be specific and practical, not generic.

Return JSON:
{"suggestion": "<the suggested text>"}`,
    },
  ]
}

export function chatGptFormatMessages(content: string): Message[] {
  return [
    {
      role: 'system',
      content:
        'You reformat professional context files (CLAUDE.md) into ChatGPT Custom Instructions. ' +
        'ChatGPT has two fields with a combined 1,500 character limit. Return ONLY valid JSON.',
    },
    {
      role: 'user',
      content: `Convert this context file into ChatGPT Custom Instructions format.

ChatGPT has two fields:
1. "What would you like ChatGPT to know about you?" — background, role, expertise, values (max ~750 chars)
2. "How would you like ChatGPT to respond?" — tone, format, constraints, style (max ~750 chars)

Be concise. Cut fluff but keep the most distinctive and actionable facts. No markdown headers in output.

Context file:
${content.slice(0, 6000)}

Return JSON:
{
  "about": "<plain text for field 1, max 750 chars>",
  "respond": "<plain text for field 2, max 750 chars>"
}`,
    },
  ]
}

export function detectDomainMessages(content: string): Message[] {
  return [
    {
      role: 'system',
      content:
        'You analyze professional AI context files (CLAUDE.md) to extract the user\'s domain and generate tailored test prompts. Return ONLY valid JSON.',
    },
    {
      role: 'user',
      content: `Analyze this context file and return JSON in exactly this shape:
{
  "domain": "concise domain name, e.g. 'iOS Development', 'Product Management', 'Data Science', 'UX Design'",
  "description": "one sentence about what this person does and their distinctive style",
  "prompts": [
    { "label": "3-5 word label", "prompt": "A specific task prompt that would reveal this person's unique perspective and voice. Written as a direct instruction, e.g. 'Write a LinkedIn post sharing my take on the biggest misconception in [their field]'" },
    { "label": "...", "prompt": "..." },
    { "label": "...", "prompt": "..." },
    { "label": "...", "prompt": "..." }
  ]
}

Generate exactly 4 prompts specific to their domain, values, and communication style. Choose tasks where a personalized AI (one that knows their context file) will produce a noticeably different and better result than a generic AI — revealing the real value of a great context file.

Context file:
${content.slice(0, 6000)}`,
    },
  ]
}

export function optimizeMessages(content: string): Message[] {
  return [
    {
      role: 'system',
      content:
        'You are an expert at improving AI context files. Refine the provided file to maximize AI productivity. ' +
        'Preserve the person\'s voice and all correct content. Return ONLY valid JSON.',
    },
    {
      role: 'user',
      content: `Optimize this AI context/skill file:

<file>
${content.slice(0, 8000)}
</file>

Improvements to make:
1. Fill missing sections with intelligent defaults based on context clues
2. Make vague statements more specific (e.g., "I like clean code" → "I prefer functions under 30 lines with explicit error handling")
3. Add concrete constraints if none exist
4. Improve structure with clear markdown headings
5. Add output format preferences if missing

Also score the file before and after optimization (0-100).

Return JSON:
{
  "markdown": "<complete improved markdown file>",
  "score_before": <integer 0-100>,
  "score_after": <integer 0-100>,
  "changes": [
    {"section": "<section name>", "what_changed": "<specific description>", "impact": "High" | "Medium" | "Low"}
  ]
}`,
    },
  ]
}
