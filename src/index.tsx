#!/usr/bin/env bun
import { createCliRenderer, type CliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App.tsx";
import { initDatabase, closeDatabase, cleanupOldCompletedTasks, DB_PATH } from "./db.ts";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { dirname } from "path";

let renderer: CliRenderer | null = null;

async function main() {
  // Check if database exists, if not run migration
  if (!existsSync(DB_PATH)) {
    console.log("Initializing Paca database...");
    try {
      // Run prisma migration
      const projectDir = dirname(dirname(import.meta.path));
      execSync(`cd "${projectDir}" && bunx prisma migrate deploy`, {
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: `file:${DB_PATH}`,
        },
      });
      console.log("Database initialized successfully!");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      process.exit(1);
    }
  }

  // Initialize database connection
  const connected = await initDatabase();
  if (!connected) {
    console.error("Failed to connect to database");
    process.exit(1);
  }

  // Clean up tasks that have been done for more than 3 days
  await cleanupOldCompletedTasks(3);

  // Handle cleanup on exit - must stop renderer to restore terminal state
  const cleanup = async () => {
    if (renderer) {
      renderer.stop();
    }
    await closeDatabase();
    // Give renderer time to finish, then reset terminal and exit
    setTimeout(() => {
      try {
        require("child_process").spawnSync("reset", [], { stdio: "inherit" });
      } catch {}
      process.exit(0);
    }, 50);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Create and start the TUI
  try {
    renderer = await createCliRenderer({
      exitOnCtrlC: false,
    });

    createRoot(renderer).render(<App />);
  } catch (error) {
    console.error("Failed to start Paca:", error);
    await closeDatabase();
    process.exit(1);
  }
}

main();
