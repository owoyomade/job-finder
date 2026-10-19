import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type {
  DocumentKind,
  Job,
  SearchParams,
  StoredDocument,
  StoredProfile,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.JOBFINDER_DB ?? path.join(DATA_DIR, "jobfinder.db");

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  if (DB_PATH !== ":memory:") fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      saved INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saved_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      params TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS search_cache (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

const now = () => new Date().toISOString();

// ---------- Profile ----------

export function getProfile(): StoredProfile | null {
  const row = getDb().prepare("SELECT data FROM profile WHERE id = 1").get() as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as StoredProfile) : null;
}

export function saveProfile(p: Omit<StoredProfile, "updatedAt">): StoredProfile {
  const stored: StoredProfile = { ...p, updatedAt: now() };
  getDb()
    .prepare(
      "INSERT INTO profile (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
    )
    .run(JSON.stringify(stored));
  return stored;
}

// ---------- Jobs ----------

/** Store jobs seen in search results so the job workspace can load them by id. */
export function upsertJobs(jobs: Job[]) {
  const stmt = getDb().prepare(
    `INSERT INTO jobs (id, data, saved, updated_at) VALUES (?, ?, 0, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  );
  for (const j of jobs) stmt.run(j.id, JSON.stringify(j), now());
}

export function getJob(id: string): (Job & { saved: boolean }) | null {
  const row = getDb().prepare("SELECT data, saved FROM jobs WHERE id = ?").get(id) as
    | { data: string; saved: number }
    | undefined;
  return row ? { ...(JSON.parse(row.data) as Job), saved: row.saved === 1 } : null;
}

export function updateJob(job: Job) {
  getDb()
    .prepare("UPDATE jobs SET data = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(job), now(), job.id);
}

export function setJobSaved(id: string, saved: boolean) {
  getDb().prepare("UPDATE jobs SET saved = ? WHERE id = ?").run(saved ? 1 : 0, id);
}

export function listSavedJobs(): Job[] {
  const rows = getDb()
    .prepare("SELECT data FROM jobs WHERE saved = 1 ORDER BY updated_at DESC")
    .all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as Job);
}

export function getSavedJobIds(): Set<string> {
  const rows = getDb().prepare("SELECT id FROM jobs WHERE saved = 1").all() as { id: string }[];
  return new Set(rows.map((r) => r.id));
}

/** Create a job record for a description the user pasted in (no search needed). */
export function createManualJob(input: {
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
}): Job {
  const job: Job = {
    id: `manual-${Date.now().toString(36)}`,
    source: "mock",
    publisher: "Pasted",
    title: input.title,
    company: input.company || "Unknown company",
    location: input.location,
    remote: /remote/i.test(input.location),
    postedAt: null,
    description: input.description,
    applyUrl: input.applyUrl,
  };
  upsertJobs([job]);
  setJobSaved(job.id, true);
  return job;
}

// ---------- Saved searches ----------

export function listSavedSearches(): { id: number; name: string; params: SearchParams; createdAt: string }[] {
  const rows = getDb()
    .prepare("SELECT id, name, params, created_at FROM saved_searches ORDER BY id DESC")
    .all() as { id: number; name: string; params: string; created_at: string }[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    params: JSON.parse(r.params) as SearchParams,
    createdAt: r.created_at,
  }));
}

export function addSavedSearch(name: string, params: SearchParams) {
  getDb()
    .prepare("INSERT INTO saved_searches (name, params, created_at) VALUES (?, ?, ?)")
    .run(name, JSON.stringify(params), now());
}

export function deleteSavedSearch(id: number) {
  getDb().prepare("DELETE FROM saved_searches WHERE id = ?").run(id);
}

// ---------- Search cache ----------

export function getCached<T>(key: string, maxAgeMs: number): T | null {
  const row = getDb().prepare("SELECT data, created_at FROM search_cache WHERE key = ?").get(key) as
    | { data: string; created_at: number }
    | undefined;
  if (!row || Date.now() - row.created_at > maxAgeMs) return null;
  return JSON.parse(row.data) as T;
}

export function setCached(key: string, data: unknown) {
  getDb()
    .prepare(
      `INSERT INTO search_cache (key, data, created_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET data = excluded.data, created_at = excluded.created_at`,
    )
    .run(key, JSON.stringify(data), Date.now());
}

// ---------- Documents ----------

export function saveDocument(
  jobId: string | null,
  kind: DocumentKind,
  title: string,
  data: StoredDocument["data"],
): StoredDocument {
  const createdAt = now();
  const res = getDb()
    .prepare("INSERT INTO documents (job_id, kind, title, data, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(jobId, kind, title, JSON.stringify(data), createdAt);
  return { id: Number(res.lastInsertRowid), jobId, kind, title, data, createdAt };
}

export function updateDocument(id: number, data: StoredDocument["data"]) {
  getDb().prepare("UPDATE documents SET data = ? WHERE id = ?").run(JSON.stringify(data), id);
}

type DocRow = { id: number; job_id: string | null; kind: string; title: string; data: string; created_at: string };

const toDoc = (r: DocRow): StoredDocument => ({
  id: r.id,
  jobId: r.job_id,
  kind: r.kind as DocumentKind,
  title: r.title,
  data: JSON.parse(r.data),
  createdAt: r.created_at,
});

export function getDocument(id: number): StoredDocument | null {
  const row = getDb().prepare("SELECT * FROM documents WHERE id = ?").get(id) as DocRow | undefined;
  return row ? toDoc(row) : null;
}

export function listDocuments(filter: { jobId?: string; kind?: DocumentKind } = {}): StoredDocument[] {
  const where: string[] = [];
  const args: string[] = [];
  if (filter.jobId) {
    where.push("job_id = ?");
    args.push(filter.jobId);
  }
  if (filter.kind) {
    where.push("kind = ?");
    args.push(filter.kind);
  }
  const sql = `SELECT * FROM documents ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id DESC`;
  return (getDb().prepare(sql).all(...args) as DocRow[]).map(toDoc);
}

export function deleteDocument(id: number) {
  getDb().prepare("DELETE FROM documents WHERE id = ?").run(id);
}
