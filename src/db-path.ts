import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { writeSanitizedSnapshot } from "./db-snapshot.ts";

const ACTIVE_FILE = ".active";

// ~/.paca holds business data and, until you rotate to a restricted key, a
// working Stripe credential. Nobody else on the machine needs to read it.
const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

export function getPacaDir(): string {
	const dir = join(homedir(), ".paca");
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true, mode: DIR_MODE });
	}
	return dir;
}

export function getBackupsDir(): string {
	const dir = join(getPacaDir(), "backups");
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true, mode: DIR_MODE });
	}
	return dir;
}

// Tighten permissions on a directory tree that may predate the modes above.
// mkdir's mode argument only applies at creation, so existing installs keep
// whatever the umask gave them (typically world-readable 0755/0644).
export function hardenPacaPermissions(): void {
	const dir = getPacaDir();
	chmodTo(dir, DIR_MODE);

	const backupDir = join(dir, "backups");
	if (existsSync(backupDir)) {
		chmodTo(backupDir, DIR_MODE);
		for (const file of readdirSync(backupDir)) {
			if (file.endsWith(".db")) chmodTo(join(backupDir, file), FILE_MODE);
		}
	}

	for (const file of readdirSync(dir)) {
		if (file.endsWith(".db") || file.endsWith(".db-wal") || file.endsWith(".db-shm")) {
			chmodTo(join(dir, file), FILE_MODE);
		}
	}
}

function chmodTo(path: string, mode: number): void {
	try {
		if ((statSync(path).mode & 0o777) !== mode) {
			chmodSync(path, mode);
		}
	} catch {
		// Best effort — a filesystem that rejects chmod is not a reason to fail startup
	}
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

	const backupDir = getBackupsDir();

	const dbName = dbFilename.replace(/\.db$/, "");
	const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
	const todayBackup = `${dbName}-auto-${today}.db`;

	// Skip if today's backup already exists
	if (existsSync(join(backupDir, todayBackup))) return;

	// Create today's backup, without the Stripe key
	writeSanitizedSnapshot(dbPath, join(backupDir, todayBackup));

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
