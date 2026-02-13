#!/usr/bin/env bun
import { createCliRenderer, type CliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App.tsx";
import {
	initDatabase,
	closeDatabase,
	cleanupOldCompletedTasks,
} from "./db.ts";
import { getActiveDbPath } from "./db-path.ts";
import { getTheme, type Theme } from "./types.ts";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { dirname } from "path";
import Database from "bun:sqlite";

let renderer: CliRenderer | null = null;

// Try to read the theme setting from the database
function getStoredTheme(): Theme {
	try {
		if (!existsSync(getActiveDbPath())) {
			return getTheme("catppuccin-mocha");
		}
		const db = new Database(getActiveDbPath(), { readonly: true });
		const result = db
			.query("SELECT value FROM Setting WHERE key = 'theme'")
			.get() as { value: string } | null;
		db.close();
		if (result?.value) {
			return getTheme(result.value);
		}
	} catch {
		// Fall back to default theme
	}
	return getTheme("catppuccin-mocha");
}

// Convert hex color to ANSI escape sequence
function hexToAnsi(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `38;2;${r};${g};${b}`;
}

function hexToBgAnsi(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `48;2;${r};${g};${b}`;
}

// Show splash screen with ASCII art paca
function showSplash(theme: Theme): boolean {
	try {
		const cols = process.stdout.columns || 80;
		const rows = process.stdout.rows || 24;
		const colors = theme.colors;

		// Cute ASCII alpaca
		const paca = [
			"      /\\  /\\",
			"     (  o o  )",
			"     (   Y   )  ~paca~",
			"      \\     /",
			"       |   |",
			"      /|   |\\",
			"     (_|   |_)",
		];

		const logoLines = [
			"",
			// "██████╗  █████╗  ██████╗ █████╗",
			// "██╔══██╗██╔══██╗██╔════╝██╔══██╗",
			// "██████╔╝███████║██║     ███████║",
			// "██╔═══╝ ██╔══██║██║     ██╔══██║",
			// "██║     ██║  ██║╚██████╗██║  ██║",
			// "╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝",
		];
		const tagline = "project management for terminal";

		const totalHeight = paca.length + 2 + logoLines.length + 1 + 1;
		const startRow = Math.max(1, Math.floor((rows - totalHeight) / 2));

		// Use theme colors
		const pacaColor = hexToAnsi(colors.accentSecondary);
		const logoColor = hexToAnsi(colors.accent);
		const taglineColor = hexToAnsi(colors.textSecondary);
		const bgColor = hexToBgAnsi(colors.bg);

		// Clear screen with background color and hide cursor
		process.stdout.write(`\x1b[2J\x1b[H\x1b[?25l`);

		// Fill screen with background color
		for (let row = 1; row <= rows; row++) {
			process.stdout.write(
				`\x1b[${row};1H\x1b[${bgColor}m${" ".repeat(cols)}\x1b[0m`,
			);
		}

		// Output paca ASCII art centered
		const pacaWidth = Math.max(...paca.map((line) => line.length));
		for (let i = 0; i < paca.length; i++) {
			const line = paca[i];
			const pad = Math.max(0, Math.floor((cols - pacaWidth) / 2));
			process.stdout.write(
				`\x1b[${startRow + i};${pad + 1}H\x1b[${bgColor};${pacaColor}m${line}\x1b[0m`,
			);
		}

		// Position for logo
		const logoStartRow = startRow + paca.length + 2;

		// Output PACA logo centered
		for (let i = 0; i < logoLines.length; i++) {
			const line = logoLines[i];
			const pad = Math.max(0, Math.floor((cols - line.length) / 2));
			process.stdout.write(
				`\x1b[${logoStartRow + i};${pad + 1}H\x1b[${bgColor};${logoColor}m${line}\x1b[0m`,
			);
		}

		// Output tagline
		const taglineRow = logoStartRow + logoLines.length + 1;
		const taglinePad = Math.max(0, Math.floor((cols - tagline.length) / 2));
		process.stdout.write(
			`\x1b[${taglineRow};${taglinePad + 1}H\x1b[${bgColor};${taglineColor}m${tagline}\x1b[0m`,
		);

		// Move cursor to bottom
		process.stdout.write(`\x1b[${rows};1H`);

		return true;
	} catch {
		return false;
	}
}

async function main() {
	// Handle menubar subcommand before TUI setup
	const args = process.argv.slice(2);
	if (args[0] === "menubar") {
		const { menubarCommand } = await import("./menubar/index.ts");
		await menubarCommand(args.slice(1));
		return;
	}

	// Get stored theme and show splash with ASCII paca
	const theme = getStoredTheme();
	const splashShown = showSplash(theme);

	// If splash was shown, wait a moment before starting TUI
	if (splashShown) {
		await new Promise((resolve) => setTimeout(resolve, 1500));
	}

	// Check if database exists, if not run migration
	if (!existsSync(getActiveDbPath())) {
		console.log("Initializing Paca database...");
		try {
			// Run prisma migration
			const projectDir = dirname(dirname(import.meta.path));
			execSync(`cd "${projectDir}" && bunx prisma migrate deploy`, {
				stdio: "inherit",
				env: {
					...process.env,
					DATABASE_URL: `file:${getActiveDbPath()}`,
				},
			});
			console.log("Database initialized successfully!");
		} catch (error) {
			console.error("Failed to initialize database:", error);
			process.exit(1);
		}
	}

	// Daily auto-backup (rolling 30 days)
	try {
		const { performDailyBackup } = await import("./db-path.ts");
		performDailyBackup();
	} catch {
		// Non-critical — skip if backup fails
	}

	// Initialize database connection
	const connected = await initDatabase();
	if (!connected) {
		console.error("Failed to connect to database");
		process.exit(1);
	}

	// Clean up tasks that have been done for more than 3 days
	await cleanupOldCompletedTasks(3);

	// Auto-launch menu bar helper if enabled
	try {
		const db2 = new Database(getActiveDbPath(), { readonly: true });
		const menuBarSetting = db2
			.query("SELECT value FROM Setting WHERE key = 'menuBar'")
			.get() as { value: string } | null;
		db2.close();
		if (menuBarSetting?.value === "enabled") {
			const { ensureMenuBarRunning } = await import("./menubar/index.ts");
			ensureMenuBarRunning();
		}
	} catch {
		// Non-critical — skip if menu bar can't be launched
	}

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
