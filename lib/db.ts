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

  // Idempotent schema migrations (ALTER TABLE ignores duplicate-column errors)
  for (const stmt of [
    `ALTER TABLE users ADD COLUMN username TEXT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL`,
  ]) {
    try { await db.execute(stmt) } catch { /* already exists */ }
  }
}

// ── Types ─────────────────────────────────────────────────────────────

export interface DbUser {
  id: string
  email: string
  name: string
  username: string | null
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

// ── Username helpers ──────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28) || 'user'
}

async function generateUniqueUsername(db: ReturnType<typeof getDb>, base: string): Promise<string> {
  let candidate = base
  for (let i = 2; i <= 99; i++) {
    const existing = await db.execute({ sql: `SELECT id FROM users WHERE username = ?`, args: [candidate] })
    if (existing.rows.length === 0) return candidate
    candidate = `${base}${i}`
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`
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

  // Auto-assign username on first insert (idempotent — only sets when null)
  const row = await db.execute({ sql: `SELECT username, name FROM users WHERE id = ?`, args: [user.id] })
  if (row.rows.length > 0 && !row.rows[0].username) {
    const displayName = (row.rows[0].name as string) || user.email.split('@')[0]
    const base = slugify(displayName)
    const username = await generateUniqueUsername(db, base)
    await db.execute({ sql: `UPDATE users SET username = ? WHERE id = ?`, args: [username, user.id] })
  }
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

export async function getUsernameForUser(userId: string): Promise<string | null> {
  const db = getDb()
  const result = await db.execute({ sql: `SELECT username FROM users WHERE id = ?`, args: [userId] })
  return (result.rows[0]?.username as string | null) ?? null
}

// ── Public profile ────────────────────────────────────────────────────

export interface PublicProfile {
  user: { name: string; username: string; created_at: number }
  bestFile: { overall_score: number; grade: string; score_json: string | null; created_at: number } | null
  domain: string | null
  totalFiles: number
  totalTests: number
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const db = getDb()

  const userRow = await db.execute({
    sql: `SELECT id, name, username, created_at FROM users WHERE username = ?`,
    args: [username],
  })
  if (userRow.rows.length === 0) return null

  const u = userRow.rows[0] as unknown as { id: string; name: string; username: string; created_at: number }

  const [bestFileResult, domainResult, fileCountResult, testCountResult] = await Promise.all([
    db.execute({
      sql: `SELECT overall_score, grade, score_json, created_at FROM md_files
            WHERE user_id = ? AND overall_score IS NOT NULL
            ORDER BY overall_score DESC LIMIT 1`,
      args: [u.id],
    }),
    db.execute({
      sql: `SELECT detected_domain FROM test_results
            WHERE user_id = ? AND detected_domain IS NOT NULL
            ORDER BY created_at DESC LIMIT 1`,
      args: [u.id],
    }),
    db.execute({ sql: `SELECT COUNT(*) as n FROM md_files WHERE user_id = ?`, args: [u.id] }),
    db.execute({ sql: `SELECT COUNT(*) as n FROM test_results WHERE user_id = ?`, args: [u.id] }),
  ])

  return {
    user: { name: u.name, username: u.username, created_at: u.created_at },
    bestFile: bestFileResult.rows.length > 0
      ? (bestFileResult.rows[0] as unknown as PublicProfile['bestFile'])
      : null,
    domain: (domainResult.rows[0]?.detected_domain as string | null) ?? null,
    totalFiles: Number(fileCountResult.rows[0]?.n ?? 0),
    totalTests: Number(testCountResult.rows[0]?.n ?? 0),
  }
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
  rating: number | null
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
