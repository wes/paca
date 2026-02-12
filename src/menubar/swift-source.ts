/**
 * Native macOS menu bar helper — Swift source code.
 * Compiled with `swiftc` at install time, stored at ~/.paca/paca-menubar.
 *
 * @param iconBase64 - Base64-encoded PNG of the paca mascot (36x36 for retina)
 */
export function getSwiftSource(iconBase64: string): string {
  return `
import Cocoa
import SQLite3

let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

let ICON_BASE64 = "${iconBase64}"

func loadIcon() -> NSImage? {
    guard let data = Data(base64Encoded: ICON_BASE64) else { return nil }
    guard let image = NSImage(data: data) else { return nil }
    // Set point size to 18x18 (the data is @2x retina)
    image.size = NSSize(width: 18, height: 18)
    return image
}

class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem!
    var pollTimer: Timer?
    let dbPath: String
    var icon: NSImage?

    override init() {
        let home = FileManager.default.homeDirectoryForCurrentUser
        dbPath = home.appendingPathComponent(".paca/paca.db").path
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        icon = loadIcon()
        statusItem.button?.imagePosition = .imageLeading
        updateMenu()
        pollTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            DispatchQueue.main.async { self?.updateMenu() }
        }
    }

    func updateMenu() {
        var db: OpaquePointer?
        guard sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
            setIdleAppearance()
            statusItem.menu = buildFallbackMenu("Database not found")
            return
        }
        defer { sqlite3_close(db) }

        sqlite3_busy_timeout(db, 5000)

        // Check for running timer
        var stmt: OpaquePointer?
        let runningSQL = """
            SELECT te.id, te.startTime, p.name, p.color
            FROM TimeEntry te JOIN Project p ON p.id = te.projectId
            WHERE te.endTime IS NULL LIMIT 1
        """
        var runningId: String?
        var startTime: String?
        var projectName: String?

        if sqlite3_prepare_v2(db, runningSQL, -1, &stmt, nil) == SQLITE_OK {
            if sqlite3_step(stmt) == SQLITE_ROW {
                runningId = col(stmt, 0)
                startTime = col(stmt, 1)
                projectName = col(stmt, 2)
            }
        }
        sqlite3_finalize(stmt)

        // Update title and icon
        if let name = projectName, let start = startTime {
            let elapsed = formatElapsed(start)
            let title = " ▶ \\(name) \\(elapsed)"
            let attrs: [NSAttributedString.Key: Any] = [
                .foregroundColor: NSColor(red: 0.65, green: 0.89, blue: 0.63, alpha: 1.0),
                .font: NSFont.monospacedDigitSystemFont(ofSize: NSFont.systemFontSize, weight: .medium)
            ]
            statusItem.button?.attributedTitle = NSAttributedString(string: title, attributes: attrs)
            statusItem.button?.image = icon
        } else {
            setIdleAppearance()
        }

        // Build menu
        let menu = NSMenu()

        if let entryId = runningId {
            let stop = NSMenuItem(title: "Stop Timer", action: #selector(stopTimerClicked(_:)), keyEquivalent: "")
            stop.target = self
            stop.representedObject = entryId
            menu.addItem(stop)
        } else {
            // Only show project list when no timer is running
            var pStmt: OpaquePointer?
            let pSQL = "SELECT id, name FROM Project WHERE archived = 0 ORDER BY name ASC"
            var projectItems: [(id: String, name: String)] = []

            if sqlite3_prepare_v2(db, pSQL, -1, &pStmt, nil) == SQLITE_OK {
                while sqlite3_step(pStmt) == SQLITE_ROW {
                    if let id = col(pStmt, 0), let name = col(pStmt, 1) {
                        projectItems.append((id: id, name: name))
                    }
                }
            }
            sqlite3_finalize(pStmt)

            if projectItems.isEmpty {
                let empty = NSMenuItem(title: "No projects — open paca to create one", action: nil, keyEquivalent: "")
                empty.isEnabled = false
                menu.addItem(empty)
            } else {
                let header = NSMenuItem(title: "Start Timer For...", action: nil, keyEquivalent: "")
                header.isEnabled = false
                menu.addItem(header)
                for p in projectItems {
                    let item = NSMenuItem(title: "  \\(p.name)", action: #selector(startTimerClicked(_:)), keyEquivalent: "")
                    item.target = self
                    item.representedObject = p.id
                    menu.addItem(item)
                }
            }
        }

        menu.addItem(NSMenuItem.separator())
        let quit = NSMenuItem(title: "Quit Paca Menu Bar", action: #selector(quitApp), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)

        statusItem.menu = menu
    }

    func setIdleAppearance() {
        statusItem.button?.image = icon
        statusItem.button?.title = ""
        statusItem.button?.attributedTitle = NSAttributedString(string: "")
    }

    func buildFallbackMenu(_ message: String) -> NSMenu {
        let menu = NSMenu()
        let item = NSMenuItem(title: message, action: nil, keyEquivalent: "")
        item.isEnabled = false
        menu.addItem(item)
        menu.addItem(NSMenuItem.separator())
        let quit = NSMenuItem(title: "Quit Paca Menu Bar", action: #selector(quitApp), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)
        return menu
    }

    func col(_ stmt: OpaquePointer?, _ idx: Int32) -> String? {
        guard let cStr = sqlite3_column_text(stmt, idx) else { return nil }
        return String(cString: cStr)
    }

    func parseDate(_ str: String) -> Date? {
        // Try ISO8601DateFormatter first (handles Z, +00:00, etc.)
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: str) { return d }

        // Without fractional seconds
        iso.formatOptions = [.withInternetDateTime]
        if let d = iso.date(from: str) { return d }

        // Try SQLite datetime() format
        let sql = DateFormatter()
        sql.dateFormat = "yyyy-MM-dd HH:mm:ss"
        sql.timeZone = TimeZone(identifier: "UTC")
        return sql.date(from: str)
    }

    func formatElapsed(_ startTimeStr: String) -> String {
        guard let start = parseDate(startTimeStr) else { return "0:00:00" }

        let elapsed = max(0, Int(Date().timeIntervalSince(start)))
        let h = elapsed / 3600
        let m = (elapsed % 3600) / 60
        let s = elapsed % 60
        return String(format: "%d:%02d:%02d", h, m, s)
    }

    // MARK: - Actions

    @objc func stopTimerClicked(_ sender: NSMenuItem) {
        guard let entryId = sender.representedObject as? String else { return }

        let alert = NSAlert()
        alert.messageText = "What did you work on?"
        alert.addButton(withTitle: "Save")
        alert.addButton(withTitle: "Skip")
        alert.addButton(withTitle: "Cancel")

        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 300, height: 24))
        input.placeholderString = "Description (optional)"
        alert.accessoryView = input
        alert.window.initialFirstResponder = input

        NSApp.activate(ignoringOtherApps: true)
        let response = alert.runModal()

        if response == .alertThirdButtonReturn { return }

        let desc = response == .alertFirstButtonReturn ? input.stringValue : nil

        var db: OpaquePointer?
        guard sqlite3_open(dbPath, &db) == SQLITE_OK else { return }
        defer { sqlite3_close(db) }
        sqlite3_exec(db, "PRAGMA journal_mode=WAL", nil, nil, nil)
        sqlite3_busy_timeout(db, 5000)

        var stmt: OpaquePointer?
        let sql = "UPDATE TimeEntry SET endTime = datetime('now'), description = ?, updatedAt = datetime('now') WHERE id = ?"
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            if let d = desc, !d.isEmpty {
                sqlite3_bind_text(stmt, 1, (d as NSString).utf8String, -1, SQLITE_TRANSIENT)
            } else {
                sqlite3_bind_null(stmt, 1)
            }
            sqlite3_bind_text(stmt, 2, (entryId as NSString).utf8String, -1, SQLITE_TRANSIENT)
            sqlite3_step(stmt)
        }
        sqlite3_finalize(stmt)

        updateMenu()
    }

    @objc func startTimerClicked(_ sender: NSMenuItem) {
        guard let projectId = sender.representedObject as? String else { return }

        var db: OpaquePointer?
        guard sqlite3_open(dbPath, &db) == SQLITE_OK else { return }
        defer { sqlite3_close(db) }
        sqlite3_exec(db, "PRAGMA journal_mode=WAL", nil, nil, nil)
        sqlite3_busy_timeout(db, 5000)

        sqlite3_exec(db, "UPDATE TimeEntry SET endTime = datetime('now'), updatedAt = datetime('now') WHERE endTime IS NULL", nil, nil, nil)

        let id = UUID().uuidString.lowercased()
        var stmt: OpaquePointer?
        let sql = "INSERT INTO TimeEntry (id, projectId, startTime, createdAt, updatedAt) VALUES (?, ?, datetime('now'), datetime('now'), datetime('now'))"
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK {
            sqlite3_bind_text(stmt, 1, (id as NSString).utf8String, -1, SQLITE_TRANSIENT)
            sqlite3_bind_text(stmt, 2, (projectId as NSString).utf8String, -1, SQLITE_TRANSIENT)
            sqlite3_step(stmt)
        }
        sqlite3_finalize(stmt)

        updateMenu()
    }

    @objc func quitApp() {
        NSApp.terminate(nil)
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
`;
}
