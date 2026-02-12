import { join } from "path";
import { homedir } from "os";

/**
 * Returns the content of the action handler script.
 * This script is invoked by SwiftBar when the user clicks a menu item.
 */
export function getActionScript(bunPath: string): string {
  const dbPath = join(homedir(), ".paca", "paca.db");

  return `#!${bunPath}
// Paca SwiftBar Action Handler — auto-generated, do not edit

import Database from "bun:sqlite";

const DB_PATH = ${JSON.stringify(dbPath)};

function openDb() {
  const db = new Database(DB_PATH);
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("PRAGMA busy_timeout=5000");
  return db;
}

async function askDescription(): Promise<string> {
  try {
    const proc = Bun.spawnSync([
      "osascript", "-e",
      'display dialog "What did you work on?" default answer "" with title "Paca — Stop Timer" buttons {"Cancel", "Save"} default button "Save"',
    ]);
    const output = proc.stdout.toString().trim();
    // osascript returns: "button returned:Save, text returned:my description"
    const match = output.match(/text returned:(.*)/);
    return match?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

async function main() {
  const action = process.argv[2];
  const id = process.argv[3];

  if (!action || !id) {
    console.error("Usage: action.ts <start|stop> <id>");
    process.exit(1);
  }

  const db = openDb();

  try {
    if (action === "stop") {
      const description = await askDescription();
      db.query(
        \`UPDATE TimeEntry SET endTime = datetime('now'), description = ?, updatedAt = datetime('now') WHERE id = ?\`
      ).run(description || null, id);
    } else if (action === "start") {
      // Stop any running timer first
      const running = db.query("SELECT id FROM TimeEntry WHERE endTime IS NULL LIMIT 1").get();
      if (running) {
        db.query(
          \`UPDATE TimeEntry SET endTime = datetime('now'), updatedAt = datetime('now') WHERE id = ?\`
        ).run(running.id);
      }

      // Start new timer
      const newId = crypto.randomUUID();
      db.query(
        \`INSERT INTO TimeEntry (id, projectId, startTime, createdAt, updatedAt)
         VALUES (?, ?, datetime('now'), datetime('now'), datetime('now'))\`
      ).run(newId, id);
    }
  } finally {
    db.close();
  }
}

main();
`;
}
