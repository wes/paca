# Demo recordings

The README embeds two GIFs from `docs/`:

| File | Shows |
|---|---|
| `docs/paca-demo.gif` | Splash, dashboard, start timer, live earnings, stop timer |
| `docs/paca-menubar.gif` | The macOS menu bar companion |

They live in `docs/` rather than `assets/` on purpose: `assets/` is in the `files`
allowlist in `package.json` and ships to npm, and ~2 MB of GIFs would land in every
install. `docs/` is not published.

## How the current GIFs were made

Both were derived from the screen recordings on
<https://joedesigns.com/blog/paca-tui-time-tracking>:

```bash
# Main demo — splash + dashboard, then the full timer loop
FC="[0:v]trim=0.5:7,setpts=PTS-STARTPTS[a];\
[0:v]trim=29.5:47,setpts=PTS-STARTPTS[b];\
[a][b]concat=n=2:v=1:a=0,fps=10,scale=800:-1:flags=lanczos"

ffmpeg -i paca-tui.mp4 -filter_complex "${FC},palettegen=max_colors=192:stats_mode=diff" \
  -frames:v 1 palette.png
ffmpeg -i paca-tui.mp4 -i palette.png \
  -filter_complex "${FC}[v];[v][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
  -loop 0 docs/paca-demo.gif
```

The menu bar clip is cropped to drop empty desktop and uses a 64-colour palette with
`dither=none`, because dithering the desktop gradient tripled the file size for no visible
gain.

**Note:** the source recordings are variable frame rate — the container advertises 60 fps
but the real average is ~6 fps. `setpts=N/FRAME_RATE/TB` will silently compress a 24-second
clip to about 2 seconds. Use `trim` + `setpts=PTS-STARTPTS` as above.

## Re-recording from scratch

`demo.tape` drives a scripted run for [vhs](https://github.com/charmbracelet/vhs), for when
the UI changes enough that the existing GIFs are stale.

```bash
brew install vhs
vhs .vhs/demo.tape        # writes assets/paca-demo.gif — move it to docs/
```

`paca` must be on your `PATH` (`bun link`, or `npm i -g pacatui`).

### Record against a throwaway database

Paca reads its database name from `~/.paca/.active`, so you can point it at demo data and
put it back afterwards without touching real projects, clients, or invoices.

```bash
cat ~/.paca/.active 2>/dev/null || echo "paca.db"   # save what is active now
echo "demo.db" > ~/.paca/.active                    # switch to demo data
vhs .vhs/demo.tape
echo "paca.db" > ~/.paca/.active                    # restore
```

Seed enough that the screens look alive — 2–3 projects with rates, 5–8 tasks across mixed
statuses, and time entries spread over two weeks so Timesheets and Reports both have
something to draw. **An empty app is worse than no demo at all.**

### Check before committing

- Legible when scaled to ~880px, which is how GitHub renders it
- No real client names, email addresses, invoice amounts, or Stripe data on screen
- Under ~2 MB per GIF so the README loads quickly
- Timer and reports screens actually populated

### Adjusting the script

Keybindings the tape depends on (`src/App.tsx`): `1` dashboard, `2` tasks, `3` timesheets,
`4` invoices, `5` reports, `6` settings, `t` start timer, `j`/`k` navigate, `Space` toggle
task status, `]` next report, `q` quit. If you reorder the global navigation keys, update
the tape too.
