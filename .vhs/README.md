# Recording the demo GIF

`demo.tape` drives a scripted run of Paca and renders it to `assets/paca-demo.gif`.

## Prerequisites

```bash
brew install vhs      # https://github.com/charmbracelet/vhs
```

`paca` must be on your `PATH` (`bun link` from the repo, or `npm i -g pacatui`).

## Record against a throwaway database

Paca picks its database from `~/.paca/.active`, so you can point it at demo data and
put it back afterwards without touching your real projects, clients, or invoices.

```bash
# Save whatever is currently active
cat ~/.paca/.active 2>/dev/null || echo "paca.db"

# Switch to a demo database (create it in Settings, or copy an existing one)
echo "demo.db" > ~/.paca/.active
```

Launch Paca once and seed enough data that the screens look alive:

- 2–3 projects with distinct colors, at least one with an hourly rate
- 5–8 tasks across mixed statuses and priorities
- several time entries spread over the past two weeks, so Timesheets and Reports
  both have something to draw

**An empty app is worse than no demo at all** — blank dashboards and zeroed charts read
as an unfinished project. This is the step that decides whether the GIF helps.

Then record and restore:

```bash
vhs .vhs/demo.tape
echo "paca.db" > ~/.paca/.active     # restore your real database
```

## Check before committing

- Text is legible when the GIF is scaled to ~880px, which is how GitHub renders it
- No real client names, email addresses, invoice amounts, or Stripe data on screen
- Under ~5 MB, so the README loads quickly
- The timer and reports screens are actually populated

## Wire it into the README

Once `assets/paca-demo.gif` exists, add it directly under the tagline:

```markdown
## Demo

![Paca in action](assets/paca-demo.gif)
```

## Adjusting the script

Keybindings the tape depends on (`src/App.tsx`): `1` dashboard, `2` tasks,
`3` timesheets, `4` invoices, `5` reports, `6` settings, `t` start timer,
`j`/`k` navigate, `Space` toggle task status, `]` next report, `q` quit.

If you reorder the global navigation keys, update this tape too.
