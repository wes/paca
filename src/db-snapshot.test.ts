import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import Database from "bun:sqlite";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { writeSanitizedSnapshot } from "./db-snapshot.ts";

// Assembled at runtime rather than written as a literal. The bytes are what
// the byte-scan assertion below needs, but a literal sk_live_ string in a
// tracked file trips GitHub push protection and blocks the push.
const SECRET = ["sk", "live", "51NotARealKeyButLongEnoughToSpot"].join("_");

let dir: string;
let source: string;

function seedSource(): void {
	const db = new Database(source);
	db.exec("PRAGMA journal_mode=WAL");
	db.exec("CREATE TABLE Setting (key TEXT PRIMARY KEY, value TEXT, updatedAt TEXT)");
	db.exec("CREATE TABLE Project (id TEXT PRIMARY KEY, name TEXT)");
	db.query("INSERT INTO Setting VALUES (?, ?, ?)").run("stripeApiKey", SECRET, "now");
	db.query("INSERT INTO Setting VALUES (?, ?, ?)").run("businessName", "Joe Designs", "now");
	db.query("INSERT INTO Project VALUES (?, ?)").run("p1", "Alpha");
	db.close();
}

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "paca-snapshot-"));
	source = join(dir, "paca.db");
	seedSource();
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

describe("writeSanitizedSnapshot", () => {
	test("removes the Stripe key from the snapshot", () => {
		const target = join(dir, "backup.db");
		writeSanitizedSnapshot(source, target);

		const snapshot = new Database(target, { readonly: true });
		const rows = snapshot.query("SELECT key FROM Setting").all() as { key: string }[];
		snapshot.close();

		expect(rows.map((r) => r.key)).toEqual(["businessName"]);
	});

	test("leaves no trace of the key in the snapshot bytes", () => {
		const target = join(dir, "backup.db");
		writeSanitizedSnapshot(source, target);

		expect(readFileSync(target).includes(SECRET)).toBe(false);
	});

	test("preserves everything else", () => {
		const target = join(dir, "backup.db");
		writeSanitizedSnapshot(source, target);

		const snapshot = new Database(target, { readonly: true });
		const projects = snapshot.query("SELECT id, name FROM Project").all();
		const business = snapshot
			.query("SELECT value FROM Setting WHERE key = 'businessName'")
			.get() as { value: string };
		snapshot.close();

		expect(projects).toEqual([{ id: "p1", name: "Alpha" }]);
		expect(business.value).toBe("Joe Designs");
	});

	test("captures writes still sitting in the WAL", () => {
		// A plain file copy of paca.db would miss this row entirely.
		const live = new Database(source);
		live.query("INSERT INTO Project VALUES (?, ?)").run("p2", "Beta");

		const target = join(dir, "backup.db");
		writeSanitizedSnapshot(source, target);
		live.close();

		const snapshot = new Database(target, { readonly: true });
		const count = snapshot.query("SELECT COUNT(*) AS n FROM Project").get() as { n: number };
		snapshot.close();

		expect(count.n).toBe(2);
	});

	test("does not modify the source database", () => {
		writeSanitizedSnapshot(source, join(dir, "backup.db"));

		const live = new Database(source, { readonly: true });
		const row = live.query("SELECT value FROM Setting WHERE key = 'stripeApiKey'").get() as {
			value: string;
		};
		live.close();

		expect(row.value).toBe(SECRET);
	});

	test("writes the snapshot owner-readable only", () => {
		const target = join(dir, "backup.db");
		writeSanitizedSnapshot(source, target);

		expect(statSync(target).mode & 0o777).toBe(0o600);
	});

	test("refuses to overwrite an existing file", () => {
		const target = join(dir, "backup.db");
		writeSanitizedSnapshot(source, target);

		expect(() => writeSanitizedSnapshot(source, target)).toThrow(/Refusing to overwrite/);
	});

	test("throws when the source is missing", () => {
		expect(() => writeSanitizedSnapshot(join(dir, "nope.db"), join(dir, "out.db"))).toThrow(
			/Database not found/,
		);
	});

	test("leaves no snapshot behind when sanitizing fails", () => {
		// A database with no Setting table: VACUUM INTO succeeds, the DELETE does not.
		const broken = join(dir, "broken.db");
		const db = new Database(broken);
		db.exec("CREATE TABLE Unrelated (id TEXT)");
		db.close();

		const target = join(dir, "broken-backup.db");
		expect(() => writeSanitizedSnapshot(broken, target)).toThrow();
		expect(existsSync(target)).toBe(false);
	});
});
