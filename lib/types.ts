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
  mode: 'guided' | 'voice' | 'linkedin' | 'suggest'
  answers?: Record<string, string>
  step?: string
  transcript?: string
  linkedin_text?: string
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
