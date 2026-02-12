import { existsSync, writeFileSync, unlinkSync, chmodSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";
import { getPluginScript } from "./plugin.ts";
import { getActionScript } from "./action.ts";
import { getRunningTimer, getProjects } from "./db-lite.ts";

const PLUGIN_FILENAME = "paca-timer.3s.ts";
const ACTION_FILENAME = "menubar-action.ts";
const PACA_DIR = join(homedir(), ".paca");
const ACTION_PATH = join(PACA_DIR, ACTION_FILENAME);

function resolveBunPath(): string {
  try {
    return execSync("which bun", { encoding: "utf-8" }).trim();
  } catch {
    throw new Error("Could not find bun in PATH. Is Bun installed?");
  }
}

function findSwiftBarPluginDir(): string | null {
  // Try reading from SwiftBar defaults
  try {
    const dir = execSync(
      "defaults read com.ameba.SwiftBar PluginDirectory 2>/dev/null",
      { encoding: "utf-8" },
    ).trim();
    if (dir && existsSync(dir)) return dir;
  } catch {
    // ignore
  }

  // Check common locations
  const candidates = [
    join(homedir(), "Library", "Application Support", "SwiftBar", "Plugins"),
    join(homedir(), ".swiftbar"),
  ];

  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }

  return null;
}

function isSwiftBarInstalled(): boolean {
  return (
    existsSync("/Applications/SwiftBar.app") ||
    existsSync(join(homedir(), "Applications", "SwiftBar.app"))
  );
}

function formatElapsed(startTimeStr: string): string {
  const startMs = new Date(startTimeStr + "Z").getTime();
  const elapsedMs = Date.now() - startMs;
  const totalSec = Math.floor(elapsedMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function install() {
  if (!isSwiftBarInstalled()) {
    console.log("SwiftBar is not installed.");
    console.log("");
    console.log("Install it with:");
    console.log("  brew install --cask swiftbar");
    console.log("");
    console.log("Then run this command again:");
    console.log("  paca menubar install");
    process.exit(1);
  }

  const pluginDir = findSwiftBarPluginDir();
  if (!pluginDir) {
    console.log("Could not find SwiftBar plugin directory.");
    console.log("");
    console.log("Make sure SwiftBar has been launched at least once,");
    console.log("or set a plugin directory in SwiftBar preferences.");
    process.exit(1);
  }

  const bunPath = resolveBunPath();
  const pluginPath = join(pluginDir, PLUGIN_FILENAME);

  // Write plugin script
  writeFileSync(pluginPath, getPluginScript(bunPath), "utf-8");
  chmodSync(pluginPath, 0o755);

  // Write action script
  writeFileSync(ACTION_PATH, getActionScript(bunPath), "utf-8");
  chmodSync(ACTION_PATH, 0o755);

  console.log("Paca menu bar plugin installed!");
  console.log("");
  console.log(`  Plugin: ${pluginPath}`);
  console.log(`  Action: ${ACTION_PATH}`);
  console.log("");
  console.log("The timer should appear in your menu bar shortly.");
  console.log("If not, open SwiftBar and refresh plugins.");
}

async function uninstall() {
  let removed = false;

  // Remove plugin
  const pluginDir = findSwiftBarPluginDir();
  if (pluginDir) {
    const pluginPath = join(pluginDir, PLUGIN_FILENAME);
    if (existsSync(pluginPath)) {
      unlinkSync(pluginPath);
      console.log(`Removed plugin: ${pluginPath}`);
      removed = true;
    }
  }

  // Remove action script
  if (existsSync(ACTION_PATH)) {
    unlinkSync(ACTION_PATH);
    console.log(`Removed action script: ${ACTION_PATH}`);
    removed = true;
  }

  if (removed) {
    console.log("");
    console.log("Paca menu bar plugin uninstalled.");
  } else {
    console.log("No menu bar plugin files found to remove.");
  }
}

function status() {
  const DB_PATH = join(PACA_DIR, "paca.db");
  if (!existsSync(DB_PATH)) {
    console.log("No database found. Run paca to initialize.");
    return;
  }

  const running = getRunningTimer();
  if (running) {
    const elapsed = formatElapsed(running.startTime);
    console.log(`Timer running: ${running.projectName} (${elapsed})`);
  } else {
    console.log("No timer running.");
  }

  const projects = getProjects();
  if (projects.length > 0) {
    console.log("");
    console.log("Projects:");
    for (const p of projects) {
      console.log(`  - ${p.name}`);
    }
  }
}

function showHelp() {
  const running = getRunningTimer();
  if (running) {
    const elapsed = formatElapsed(running.startTime);
    console.log(`Timer: ${running.projectName} (${elapsed})`);
  } else {
    console.log("No timer running.");
  }

  console.log("");
  console.log("Menu bar commands:");
  console.log("  paca menubar install    Install SwiftBar plugin");
  console.log("  paca menubar uninstall  Remove SwiftBar plugin");
  console.log("  paca menubar status     Show current timer status");
  console.log("");

  if (!isSwiftBarInstalled()) {
    console.log("SwiftBar is not installed. Install it with:");
    console.log("  brew install --cask swiftbar");
  } else {
    const pluginDir = findSwiftBarPluginDir();
    if (pluginDir) {
      const pluginPath = join(pluginDir, PLUGIN_FILENAME);
      if (existsSync(pluginPath)) {
        console.log("Status: Plugin installed");
      } else {
        console.log("Status: SwiftBar found, plugin not installed");
        console.log("  Run: paca menubar install");
      }
    } else {
      console.log("Status: SwiftBar found, but no plugin directory set");
      console.log("  Launch SwiftBar first, then run: paca menubar install");
    }
  }
}

export async function menubarCommand(args: string[]) {
  const subcommand = args[0];

  switch (subcommand) {
    case "install":
      await install();
      break;
    case "uninstall":
      await uninstall();
      break;
    case "status":
      status();
      break;
    default:
      showHelp();
      break;
  }
}
