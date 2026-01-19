#!/usr/bin/env bun
import { createCliRenderer, type CliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App.tsx";
import { initDatabase, closeDatabase, cleanupOldCompletedTasks, DB_PATH } from "./db.ts";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { dirname } from "path";

let renderer: CliRenderer | null = null;

// Show splash screen with ASCII art paca
function showSplash(): boolean {
  try {
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;

    // Cute ASCII paca
    const paca = [
      "       \\\\",
      "        \\\\  ♥",
      "    (\\__/)",
      "    (o^.^)    ~paca~",
      "    z(_(\")(\"))",
    ];

    const logoLines = [
      "██████╗  █████╗  ██████╗ █████╗",
      "██╔══██╗██╔══██╗██╔════╝██╔══██╗",
      "██████╔╝███████║██║     ███████║",
      "██╔═══╝ ██╔══██║██║     ██╔══██║",
      "██║     ██║  ██║╚██████╗██║  ██║",
      "╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝",
    ];
    const tagline = "Task Management for the Terminal";

    const totalHeight = paca.length + 2 + logoLines.length + 1 + 1;
    const startRow = Math.max(1, Math.floor((rows - totalHeight) / 2));

    // Clear screen and hide cursor
    process.stdout.write("\x1b[2J\x1b[H\x1b[?25l");

    // Output paca ASCII art centered
    for (let i = 0; i < paca.length; i++) {
      const line = paca[i];
      const pad = Math.max(0, Math.floor((cols - 20) / 2));
      process.stdout.write(`\x1b[${startRow + i};${pad + 1}H\x1b[38;2;222;184;135m${line}\x1b[0m`);
    }

    // Position for logo
    const logoStartRow = startRow + paca.length + 2;

    // Output PACA logo centered
    for (let i = 0; i < logoLines.length; i++) {
      const line = logoLines[i];
      const pad = Math.max(0, Math.floor((cols - line.length) / 2));
      process.stdout.write(`\x1b[${logoStartRow + i};${pad + 1}H\x1b[38;2;96;165;250m${line}\x1b[0m`);
    }

    // Output tagline
    const taglineRow = logoStartRow + logoLines.length + 1;
    const taglinePad = Math.max(0, Math.floor((cols - tagline.length) / 2));
    process.stdout.write(`\x1b[${taglineRow};${taglinePad + 1}H\x1b[38;2;100;116;139m${tagline}\x1b[0m`);

    // Move cursor to bottom
    process.stdout.write(`\x1b[${rows};1H`);

    return true;
  } catch {
    return false;
  }
}

async function main() {
  // Show splash with ASCII paca
  const splashShown = showSplash();

  // If splash was shown, wait a moment before starting TUI
  if (splashShown) {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

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
