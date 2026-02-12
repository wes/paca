import { join } from "path";
import { homedir } from "os";

/**
 * Returns the content of the SwiftBar plugin script.
 * The script is a self-contained Bun script that reads the Paca DB
 * and outputs SwiftBar-formatted text.
 */
export function getPluginScript(bunPath: string): string {
  const dbPath = join(homedir(), ".paca", "paca.db");
  const actionPath = join(homedir(), ".paca", "menubar-action.ts");

  return `#!${bunPath}
// Paca SwiftBar Plugin — auto-generated, do not edit
// Refresh: every 3 seconds (from filename)

import Database from "bun:sqlite";

const DB_PATH = ${JSON.stringify(dbPath)};
const ACTION = ${JSON.stringify(actionPath)};
const BUN = ${JSON.stringify(bunPath)};

function main() {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
    db.exec("PRAGMA busy_timeout=5000");
  } catch {
    console.log("⏸ Paca | color=#6c7086");
    console.log("---");
    console.log("Database not found | color=#f38ba8");
    console.log("Run paca to initialize | color=#6c7086");
    return;
  }

  try {
    // Check for running timer
    const running = db
      .query(
        \`SELECT te.id, te.startTime, p.name AS projectName, p.color AS projectColor
         FROM TimeEntry te
         JOIN Project p ON p.id = te.projectId
         WHERE te.endTime IS NULL
         LIMIT 1\`
      )
      .get();

    if (running) {
      // Calculate elapsed time
      const startMs = new Date(running.startTime + "Z").getTime();
      const elapsedMs = Date.now() - startMs;
      const totalSec = Math.floor(elapsedMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const elapsed = \`\${h}:\${String(m).padStart(2, "0")}:\${String(s).padStart(2, "0")}\`;

      console.log(\`▶ \${running.projectName} \${elapsed} | color=#a6e3a1 sfimage=timer\`);
      console.log("---");
      console.log(\`Stop Timer | bash=\${BUN} param1=\${ACTION} param2=stop param3=\${running.id} terminal=false refresh=true\`);
    } else {
      console.log("⏸ Paca | color=#6c7086 sfimage=timer");
    }

    console.log("---");

    // List projects
    const projects = db
      .query("SELECT id, name, color FROM Project WHERE archived = 0 ORDER BY name ASC")
      .all();

    if (projects.length === 0) {
      console.log("No projects yet | color=#6c7086");
      console.log("Open paca to create one | color=#6c7086");
    } else {
      console.log("Start Timer For... | disabled=true color=#6c7086");
      for (const p of projects) {
        console.log(\`\${p.name} | bash=\${BUN} param1=\${ACTION} param2=start param3=\${p.id} terminal=false refresh=true color=\${p.color}\`);
      }
    }
  } finally {
    db.close();
  }
}

main();
`;
}
