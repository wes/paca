import Database from "bun:sqlite";
import { join } from "path";
import { homedir } from "os";

const DB_PATH = join(homedir(), ".paca", "paca.db");

function openReadonly(): Database {
  const db = new Database(DB_PATH, { readonly: true });
  db.exec("PRAGMA busy_timeout=5000");
  return db;
}

function openReadWrite(): Database {
  const db = new Database(DB_PATH);
  db.exec("PRAGMA busy_timeout=5000");
  db.exec("PRAGMA journal_mode=WAL");
  return db;
}

export interface RunningTimerRow {
  id: string;
  startTime: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  projectHourlyRate: number | null;
}

export interface ProjectRow {
  id: string;
  name: string;
  color: string;
}

export function getRunningTimer(): RunningTimerRow | null {
  const db = openReadonly();
  try {
    const row = db
      .query<RunningTimerRow, []>(
        `SELECT te.id, te.startTime, te.projectId,
                p.name AS projectName, p.color AS projectColor,
                p.hourlyRate AS projectHourlyRate
         FROM TimeEntry te
         JOIN Project p ON p.id = te.projectId
         WHERE te.endTime IS NULL
         LIMIT 1`,
      )
      .get();
    return row ?? null;
  } finally {
    db.close();
  }
}

export function getProjects(): ProjectRow[] {
  const db = openReadonly();
  try {
    return db
      .query<ProjectRow, []>(
        `SELECT id, name, color FROM Project WHERE archived = 0 ORDER BY name ASC`,
      )
      .all();
  } finally {
    db.close();
  }
}

export function startTimer(projectId: string): void {
  const db = openReadWrite();
  try {
    // Stop any running timer first
    const running = db
      .query<{ id: string }, []>(
        `SELECT id FROM TimeEntry WHERE endTime IS NULL LIMIT 1`,
      )
      .get();
    if (running) {
      db.query(
        `UPDATE TimeEntry SET endTime = datetime('now'), updatedAt = datetime('now') WHERE id = ?`,
      ).run(running.id);
    }

    // Start new timer
    const id = crypto.randomUUID();
    db.query(
      `INSERT INTO TimeEntry (id, projectId, startTime, createdAt, updatedAt)
       VALUES (?, ?, datetime('now'), datetime('now'), datetime('now'))`,
    ).run(id, projectId);
  } finally {
    db.close();
  }
}

export function stopTimer(entryId: string, description?: string): void {
  const db = openReadWrite();
  try {
    db.query(
      `UPDATE TimeEntry SET endTime = datetime('now'), description = ?, updatedAt = datetime('now') WHERE id = ?`,
    ).run(description ?? null, entryId);
  } finally {
    db.close();
  }
}
