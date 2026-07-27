# Paca demo recording — produces assets/paca-demo.gif
#
# Requires: vhs (https://github.com/charmbracelet/vhs) and a `paca` on PATH.
# Read .vhs/README.md first — record against a throwaway database, not your real one.
#
# Run from the repo root:
#   vhs .vhs/demo.tape

Output assets/paca-demo.gif

Set Shell "zsh"
Set FontSize 16
Set Width 1200
Set Height 720
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 90ms

# --- Launch -----------------------------------------------------------------
Type "paca"
Enter
Sleep 4s

# --- Dashboard: the at-a-glance view ----------------------------------------
Type "1"
Sleep 3s

# --- Tasks: navigate and complete one ---------------------------------------
Type "2"
Sleep 2s
Type "j"
Sleep 700ms
Type "j"
Sleep 700ms
Space
Sleep 2s

# --- Timer: the core loop ---------------------------------------------------
Type "t"
Sleep 3s

# --- Timesheets: billable time collecting up --------------------------------
Type "3"
Sleep 3500ms

# --- Reports: the analytics payoff ------------------------------------------
Type "5"
Sleep 3s
Type "]"
Sleep 2500ms
Type "]"
Sleep 2500ms

# --- Land back on the dashboard ---------------------------------------------
Type "1"
Sleep 2500ms

Type "q"
Sleep 1s
