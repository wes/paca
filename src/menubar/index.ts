import { existsSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { execSync, spawn } from "child_process";
import { getSwiftSource } from "./swift-source.ts";
import { getRunningTimer, getProjects } from "./db-lite.ts";

const PACA_DIR = join(homedir(), ".paca");
const BINARY_PATH = join(PACA_DIR, "paca-menubar");
const SWIFT_PATH = join(PACA_DIR, "paca-menubar.swift");
const PID_PATH = join(PACA_DIR, "menubar.pid");
const ICON_PATH = join(PACA_DIR, "paca-icon.png");

function hasSwiftCompiler(): boolean {
  try {
    execSync("which swiftc", { encoding: "utf-8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function prepareMascotIcon(): string {
  // Find the mascot image relative to source directory
  const srcDir = dirname(dirname(import.meta.dir));
  const mascotPath = join(srcDir, "assets", "paca-mascot.png");

  if (!existsSync(mascotPath)) {
    return "";
  }

  try {
    // Resize to 36x36 (18pt @2x retina) using sips (built into macOS)
    execSync(
      `sips --resampleHeight 36 ${JSON.stringify(mascotPath)} --out ${JSON.stringify(ICON_PATH)} 2>/dev/null`,
      { encoding: "utf-8", stdio: "pipe" },
    );
    const iconData = readFileSync(ICON_PATH);
    unlinkSync(ICON_PATH);
    return iconData.toString("base64");
  } catch {
    return "";
  }
}

function compileBinary(): boolean {
  const iconBase64 = prepareMascotIcon();
  writeFileSync(SWIFT_PATH, getSwiftSource(iconBase64), "utf-8");
  try {
    execSync(
      `swiftc -O -o ${JSON.stringify(BINARY_PATH)} ${JSON.stringify(SWIFT_PATH)} -framework Cocoa -lsqlite3 2>&1`,
      { encoding: "utf-8", timeout: 60_000 },
    );
    unlinkSync(SWIFT_PATH);
    return true;
  } catch (error: any) {
    console.error("Failed to compile menu bar helper:");
    console.error(error.stdout || error.message);
    if (existsSync(SWIFT_PATH)) unlinkSync(SWIFT_PATH);
    return false;
  }
}

function readPid(): number | null {
  try {
    const pid = parseInt(readFileSync(PID_PATH, "utf-8").trim(), 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function isMenuBarRunning(): boolean {
  const pid = readPid();
  return pid !== null && isProcessRunning(pid);
}

function launchHelper(): boolean {
  if (!existsSync(BINARY_PATH)) return false;

  const child = spawn(BINARY_PATH, [], {
    detached: true,
    stdio: "ignore",
  });

  if (child.pid) {
    writeFileSync(PID_PATH, String(child.pid), "utf-8");
    child.unref();
    return true;
  }
  return false;
}

function killHelper(): boolean {
  const pid = readPid();
  if (pid === null) return false;

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process already gone
  }

  if (existsSync(PID_PATH)) unlinkSync(PID_PATH);
  return true;
}

/**
 * Enable the menu bar helper. Called from settings toggle or CLI.
 * Returns a status message string.
 */
export async function enableMenuBar(): Promise<string> {
  if (isMenuBarRunning()) {
    return "Menu bar is already running.";
  }

  if (!hasSwiftCompiler()) {
    return "Xcode Command Line Tools required. Install with: xcode-select --install";
  }

  // Compile if binary doesn't exist
  if (!existsSync(BINARY_PATH)) {
    const ok = compileBinary();
    if (!ok) return "Failed to compile menu bar helper.";
  }

  const launched = launchHelper();
  if (!launched) return "Failed to launch menu bar helper.";

  return "Menu bar enabled.";
}

/**
 * Disable the menu bar helper. Called from settings toggle or CLI.
 * Returns a status message string.
 */
export async function disableMenuBar(): Promise<string> {
  killHelper();

  // Remove binary
  if (existsSync(BINARY_PATH)) unlinkSync(BINARY_PATH);

  return "Menu bar disabled.";
}

/**
 * Ensure the helper is running if the setting is enabled.
 * Called on paca startup — no-op if already running or not enabled.
 */
export function ensureMenuBarRunning(): void {
  if (isMenuBarRunning()) return;
  if (!existsSync(BINARY_PATH)) return;
  launchHelper();
}

// --- CLI ---

function formatElapsed(startTimeStr: string): string {
  const startMs = new Date(startTimeStr + "Z").getTime();
  const elapsedMs = Date.now() - startMs;
  const totalSec = Math.floor(elapsedMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function cliEnable() {
  console.log("Compiling menu bar helper...");
  const msg = await enableMenuBar();
  console.log(msg);
}

async function cliDisable() {
  const msg = await disableMenuBar();
  console.log(msg);
}

function cliStatus() {
  const dbPath = join(PACA_DIR, "paca.db");
  if (!existsSync(dbPath)) {
    console.log("No database found. Run paca to initialize.");
    return;
  }

  console.log(`Menu bar: ${isMenuBarRunning() ? "running" : "not running"}`);
  console.log(`Binary: ${existsSync(BINARY_PATH) ? "compiled" : "not compiled"}`);
  console.log("");

  const running = getRunningTimer();
  if (running) {
    const elapsed = formatElapsed(running.startTime);
    console.log(`Timer running: ${running.projectName} (${elapsed})`);
  } else {
    console.log("No timer running.");
  }

  const allProjects = getProjects();
  if (allProjects.length > 0) {
    console.log("");
    console.log("Projects:");
    for (const p of allProjects) {
      console.log(`  - ${p.name}`);
    }
  }
}

function showHelp() {
  console.log("Menu bar commands:");
  console.log("  paca menubar enable     Compile & launch menu bar helper");
  console.log("  paca menubar disable    Stop & remove menu bar helper");
  console.log("  paca menubar status     Show current status");
  console.log("");
  console.log(`Menu bar: ${isMenuBarRunning() ? "running" : "not running"}`);
  console.log("");
  console.log("You can also toggle this from Settings in the TUI.");
}

export async function menubarCommand(args: string[]) {
  switch (args[0]) {
    case "enable":
      await cliEnable();
      break;
    case "disable":
      await cliDisable();
      break;
    case "status":
      cliStatus();
      break;
    default:
      showHelp();
      break;
  }
}
