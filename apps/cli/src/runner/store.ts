import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import type { RunDetail, RunSummary } from "@kipivo/contracts/runs";

const MAX_LOG_BYTES = 256 * 1024;

export function openRunStore(filename: string) {
  const db = new Database(filename);
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL DEFAULT 'check', status TEXT NOT NULL,
      createdAt TEXT NOT NULL, startedAt TEXT, finishedAt TEXT, exitCode INTEGER,
      error TEXT, logTruncated INTEGER NOT NULL DEFAULT 0, logs TEXT NOT NULL DEFAULT ''
    );
  `);
  const detail = db.query<Omit<RunDetail, "logTruncated"> & { logTruncated: number }, [string]>(
    "SELECT * FROM runs WHERE id = ?",
  );
  const list = db.query<Omit<RunSummary, "logTruncated"> & { logTruncated: number }, []>(`
    SELECT id, kind, status, createdAt, startedAt, finishedAt, exitCode, error, logTruncated
    FROM runs ORDER BY createdAt DESC, rowid DESC LIMIT 20
  `);
  const insert = db.query("INSERT INTO runs (id, status, createdAt) VALUES (?, 'queued', ?)");
  const start = db.query("UPDATE runs SET status = 'running', startedAt = ? WHERE id = ?");
  const finish = db.query(`
    UPDATE runs SET status = ?, exitCode = ?, error = ?, finishedAt = ? WHERE id = ?
  `);
  const append = db.query("UPDATE runs SET logs = logs || ?, logTruncated = ? WHERE id = ?");

  return {
    submit() {
      const id = randomUUID();
      insert.run(id, new Date().toISOString());
      return id;
    },
    start(id: string) {
      start.run(new Date().toISOString(), id);
    },
    finish(id: string, exitCode: number | null, error: string | null) {
      finish.run(
        exitCode === 0 && error === null ? "succeeded" : "failed",
        exitCode,
        error,
        new Date().toISOString(),
        id,
      );
    },
    interruptUnfinished() {
      db.query(`
        UPDATE runs SET status = 'failed', error = 'interrupted', finishedAt = ?
        WHERE status IN ('queued', 'running')
      `).run(new Date().toISOString());
    },
    appendLog(id: string, text: string) {
      const row = detail.get(id);
      if (!row || row.logTruncated) return;
      const bytes = Buffer.from(text);
      const limit = MAX_LOG_BYTES - Buffer.byteLength(row.logs);
      let end = Math.min(bytes.length, limit);
      // Keep complete UTF-8 characters at the byte limit.
      if (end < bytes.length) {
        while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
      }
      append.run(bytes.toString("utf8", 0, end), Number(end < bytes.length), id);
    },
    get(id: string): RunDetail | null {
      const row = detail.get(id);
      return row ? { ...row, logTruncated: Boolean(row.logTruncated) } : null;
    },
    list(): RunSummary[] {
      return list.all().map((row) => ({ ...row, logTruncated: Boolean(row.logTruncated) }));
    },
    close() {
      db.close();
    },
  };
}

export type RunStore = ReturnType<typeof openRunStore>;
