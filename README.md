# Paca

![Paca](assets/paca-mascot.png "Paca - the friendly alpaca mascot")

A simple TUI app for task, timer and invoicing for projects.

![License](https://img.shields.io/npm/l/pacatui)
![npm](https://img.shields.io/npm/v/pacatui)

## Features

- **Project Management** - Organize tasks by projects with color coding
- **Task Tracking** - Create, edit, and manage tasks with priorities and statuses
- **Time Tracking** - Start/stop timers with descriptions and hourly rates
- **Timesheets** - View uninvoiced time entries grouped by project
- **Stripe Invoicing** - Create draft invoices directly from time entries
- **Invoice Management** - View and manage all your Stripe invoices
- **Dashboard** - Overview of projects, tasks, and time stats
- **Menu Bar** - Native macOS menu bar companion for quick timer control
- **Offline-first** - All data stored locally in SQLite
- **Vim-style Navigation** - Keyboard-driven interface

## Installation

### Via npm (recommended)

```bash
npm install -g pacatui
paca
```

### Via bun

```bash
bun install -g pacatui
paca
```

### From source

```bash
git clone https://github.com/wes/paca.git
cd paca
bun install
bun run start
```

## Usage

Simply run:

```bash
paca
```

On first run, Paca will automatically create its database at `~/.paca/paca.db`.

## Keyboard Shortcuts

### Global

| Key | Action |
|-----|--------|
| `1` | Dashboard |
| `2` | Tasks |
| `3` | Timesheets |
| `4` | Invoices |
| `5` | Settings |
| `?` | Help |
| `t` | Start timer |
| `s` | Stop timer (when running) |
| `q` | Quit |

### Navigation

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `Tab` | Switch panels |
| `Enter` | Select/Confirm |
| `Esc` | Cancel/Go back |

### Projects & Tasks

| Key | Action |
|-----|--------|
| `n` | Create new |
| `e` | Edit |
| `d` | Delete |
| `Space` | Toggle task status |
| `p` | Cycle priority |
| `a` | Archive/Unarchive project |
| `A` | Toggle show archived |
| `c` | Link customer to project |

### Timesheets

| Key | Action |
|-----|--------|
| `Space` | Select entry for invoicing |
| `e` | Edit time entry |
| `d` | Delete time entry |
| `i` | Create invoice from selected |

### Invoices

| Key | Action |
|-----|--------|
| `Enter` | Open invoice in browser |
| `r` | Refresh list |
| `]` | Next page |
| `[` | Previous page |

## Configuration

### Settings

Access settings by pressing `5`:

- **Business Name** - Your business name for invoices
- **Stripe API Key** - Enable invoicing features
- **Timezone** - Set display timezone (or auto-detect)
- **Menu Bar** - Toggle the macOS menu bar companion
- **Export/Import** - Backup and restore your data

### Data Location

- Database: `~/.paca/paca.db`
- Backups: `~/.paca/backups/`

## Menu Bar (macOS)

Paca includes a native macOS menu bar companion that shows your running timer and lets you start/stop timers without opening the TUI.

### Enable via Settings

1. Press `5` to open Settings
2. Select **Menu Bar** and press `Enter` to toggle it on

### Enable via CLI

```bash
paca menubar enable    # Compile & launch
paca menubar disable   # Stop & remove
paca menubar status    # Show current status
```

The first time you enable it, Paca compiles a small native Swift helper binary (requires Xcode Command Line Tools). The paca mascot icon appears in your menu bar with live timer status.

**Requires**: Xcode Command Line Tools (`xcode-select --install`)

## Stripe Integration

To enable invoicing:

1. Get your Stripe API key from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Press `5` to go to Settings
3. Add your Stripe Secret Key
4. Link customers to projects using `c` in the Projects view
5. Create invoices from the Timesheets view

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **TUI Framework**: [@opentui/react](https://github.com/anthropic/opentui)
- **Database**: SQLite via libsql
- **ORM**: Prisma 7
- **Payments**: Stripe API

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.
