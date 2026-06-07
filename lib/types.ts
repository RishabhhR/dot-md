export interface ScoreDimension {
  name: string
  score: number
  max: number
  feedback: string
  suggestions: string[]
}

export interface ScoreResult {
  overall: number
  grade: 'Beginner' | 'Functional' | 'Proficient' | 'Expert'
  summary: string
  top_improvements: string[]
  dimensions: ScoreDimension[]
}

export interface BuildRequest {
  mode: 'guided' | 'voice' | 'linkedin' | 'cv' | 'suggest'
  answers?: Record<string, string>
  step?: string
  transcript?: string
  // CV / resume
  cv_text?: string
  // legacy single-field (kept for backward compat)
  linkedin_text?: string
  // new multi-source fields
  linkedin_paste?: string
  linkedin_pdf_text?: string
  linkedin_profile?: string
  linkedin_posts?: string
}

export interface BuildResult {
  markdown: string
}

export interface OptimizeChange {
  section: string
  what_changed: string
  impact: 'High' | 'Medium' | 'Low'
}

export interface OptimizeResult {
  markdown: string
  changes: OptimizeChange[]
  score_before: number
  score_after: number
}
