import Database from "bun:sqlite";
import { chmodSync, existsSync, rmSync } from "fs";

// Setting rows that hold credentials. Everything Paca writes to disk as a copy
// of the database — manual exports and the daily auto-backup — gets these rows
// removed first, so a backup file can be synced or handed to someone without
// carrying a live Stripe key with it.
export const SECRET_SETTING_KEYS = ["stripeApiKey"];

// Copy the database to targetPath with credential rows removed.
//
// VACUUM INTO rather than copyFileSync: it takes a read transaction, so the
// snapshot is a consistent point-in-time image that includes anything still
// sitting in the -wal sidecar. A raw file copy can miss committed writes.
// The source is opened read-only and is never modified.
export function writeSanitizedSnapshot(sourcePath: string, targetPath: string): void {
	if (!existsSync(sourcePath)) {
		throw new Error(`Database not found at ${sourcePath}`);
	}
	if (existsSync(targetPath)) {
		throw new Error(`Refusing to overwrite existing file at ${targetPath}`);
	}

	const source = new Database(sourcePath, { readonly: true });
	try {
		source.query("VACUUM INTO ?").run(targetPath);
	} finally {
		source.close();
	}

	// From here on the snapshot exists and still contains the secrets. Any
	// failure has to take the file with it rather than leave a copy behind.
	try {
		const snapshot = new Database(targetPath);
		try {
			for (const key of SECRET_SETTING_KEYS) {
				snapshot.query("DELETE FROM Setting WHERE key = ?").run(key);
			}
			// Rewrite the file so the deleted values are not left in free pages.
			snapshot.exec("VACUUM");
		} finally {
			snapshot.close();
		}
		chmodSync(targetPath, 0o600);
	} catch (error) {
		rmSync(targetPath, { force: true });
		rmSync(`${targetPath}-wal`, { force: true });
		rmSync(`${targetPath}-shm`, { force: true });
		throw error;
	}
}
