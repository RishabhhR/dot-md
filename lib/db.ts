import { createClient } from '@libsql/client'

let _client: ReturnType<typeof createClient> | null = null

export function getDb() {
  if (!_client) {
    const url = process.env.TURSO_URL
    const authToken = process.env.TURSO_AUTH_TOKEN
    if (!url || !authToken) {
      throw new Error('TURSO_URL and TURSO_AUTH_TOKEN must be set')
    }
    _client = createClient({ url, authToken })
  }
  return _client
}

export async function initDb() {
  const db = getDb()
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT NOT NULL,
      name        TEXT NOT NULL DEFAULT '',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS md_files (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content       TEXT NOT NULL,
      overall_score INTEGER,
      grade         TEXT,
      score_json    TEXT,
      source        TEXT NOT NULL DEFAULT 'unknown',
      label         TEXT,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_md_files_user_id ON md_files(user_id);
    CREATE INDEX IF NOT EXISTS idx_md_files_created_at ON md_files(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS test_results (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      md_file_id        TEXT,
      prompt            TEXT NOT NULL,
      task_label        TEXT,
      detected_domain   TEXT,
      response_generic  TEXT NOT NULL,
      response_with_ctx TEXT NOT NULL,
      rating            INTEGER,
      created_at        INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_test_results_user ON test_results(user_id, created_at DESC);
  `)
}

// ── Types ─────────────────────────────────────────────────────────────

export interface DbUser {
  id: string
  email: string
  name: string
  created_at: number
}

export interface DbMdFile {
  id: string
  user_id: string
  content: string
  overall_score: number | null
  grade: string | null
  score_json: string | null
  source: string
  label: string | null
  created_at: number
}

// ── Helpers ───────────────────────────────────────────────────────────

export async function upsertUser(user: { id: string; email: string; name: string }) {
  const db = getDb()
  await db.execute({
    sql: `INSERT INTO users (id, email, name)
          VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            name  = CASE WHEN excluded.name != '' THEN excluded.name ELSE users.name END`,
    args: [user.id, user.email, user.name],
  })
}

export async function saveMdFile(entry: {
  userId: string
  content: string
  overallScore?: number
  grade?: string
  scoreJson?: string
  source: string
  label?: string
}) {
  const db = getDb()
  const id = crypto.randomUUID()
  await db.execute({
    sql: `INSERT INTO md_files (id, user_id, content, overall_score, grade, score_json, source, label)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      entry.userId,
      entry.content,
      entry.overallScore ?? null,
      entry.grade ?? null,
      entry.scoreJson ?? null,
      entry.source,
      entry.label ?? null,
    ],
  })
  return id
}

export async function getUserHistory(userId: string): Promise<DbMdFile[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM md_files WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
    args: [userId],
  })
  return result.rows as unknown as DbMdFile[]
}

// ── Test results ──────────────────────────────────────────────────────

export interface DbTestResult {
  id: string
  user_id: string
  md_file_id: string | null
  prompt: string
  task_label: string | null
  detected_domain: string | null
  response_generic: string
  response_with_ctx: string
  rating: number | null  // 1 = thumbs up, -1 = thumbs down
  created_at: number
}

export async function saveTestResult(entry: {
  userId: string
  mdFileId?: string
  prompt: string
  taskLabel?: string
  detectedDomain?: string
  responseGeneric: string
  responseWithCtx: string
  rating?: number
}): Promise<string> {
  const db = getDb()
  const id = crypto.randomUUID()
  await db.execute({
    sql: `INSERT INTO test_results
            (id, user_id, md_file_id, prompt, task_label, detected_domain, response_generic, response_with_ctx, rating)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      entry.userId,
      entry.mdFileId ?? null,
      entry.prompt,
      entry.taskLabel ?? null,
      entry.detectedDomain ?? null,
      entry.responseGeneric,
      entry.responseWithCtx,
      entry.rating ?? null,
    ],
  })
  return id
}

export async function updateTestRating(id: string, userId: string, rating: number): Promise<void> {
  const db = getDb()
  await db.execute({
    sql: `UPDATE test_results SET rating = ? WHERE id = ? AND user_id = ?`,
    args: [rating, id, userId],
  })
}

export async function getUserTestResults(userId: string): Promise<DbTestResult[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM test_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    args: [userId],
  })
  return result.rows as unknown as DbTestResult[]
}
