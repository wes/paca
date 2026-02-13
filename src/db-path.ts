import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const ACTIVE_FILE = ".active";

export function getPacaDir(): string {
	const dir = join(homedir(), ".paca");
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	return dir;
}

export function getActiveDbFilename(): string {
	const activePath = join(getPacaDir(), ACTIVE_FILE);
	try {
		if (existsSync(activePath)) {
			const filename = readFileSync(activePath, "utf-8").trim();
			if (filename) return filename;
		}
	} catch {
		// Fall back to default
	}
	return "paca.db";
}

export function getActiveDbPath(): string {
	return join(getPacaDir(), getActiveDbFilename());
}

export function setActiveDbFilename(filename: string): void {
	const activePath = join(getPacaDir(), ACTIVE_FILE);
	writeFileSync(activePath, filename, "utf-8");
}

export function listDatabases(): string[] {
	const dir = getPacaDir();
	const active = getActiveDbFilename();
	try {
		const files = readdirSync(dir).filter((f) => f.endsWith(".db"));
		if (!files.includes(active)) {
			files.push(active);
		}
		return files.sort();
	} catch {
		return [active];
	}
}

export function performDailyBackup(): void {
	const dbFilename = getActiveDbFilename();
	const dbPath = getActiveDbPath();
	if (!existsSync(dbPath)) return;

	const backupDir = join(getPacaDir(), "backups");
	if (!existsSync(backupDir)) {
		mkdirSync(backupDir, { recursive: true });
	}

	const dbName = dbFilename.replace(/\.db$/, "");
	const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
	const todayBackup = `${dbName}-auto-${today}.db`;

	// Skip if today's backup already exists
	if (existsSync(join(backupDir, todayBackup))) return;

	// Create today's backup
	copyFileSync(dbPath, join(backupDir, todayBackup));

	// Clean up auto-backups older than 30 days
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - 30);
	const prefix = `${dbName}-auto-`;

	try {
		for (const file of readdirSync(backupDir)) {
			if (!file.startsWith(prefix) || !file.endsWith(".db")) continue;
			const dateStr = file.slice(prefix.length, -3); // extract YYYY-MM-DD
			const fileDate = new Date(dateStr);
			if (!isNaN(fileDate.getTime()) && fileDate < cutoff) {
				unlinkSync(join(backupDir, file));
			}
		}
	} catch {
		// Non-critical — skip cleanup on error
	}
}

export function sanitizeDbName(name: string): string {
	const sanitized = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (!sanitized) return "database.db";
	return sanitized.endsWith(".db") ? sanitized : `${sanitized}.db`;
}
