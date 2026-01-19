const KEYBINDINGS = [
  {
    category: "Navigation",
    bindings: [
      { key: "1", action: "Go to Dashboard" },
      { key: "2", action: "Go to Projects" },
      { key: "3", action: "Go to Tasks" },
      { key: "4", action: "Go to Settings" },
      { key: "?", action: "Show Help" },
      { key: "Tab", action: "Toggle panels" },
      { key: "h/l or ←/→", action: "Switch panels" },
      { key: "j/k or ↑/↓", action: "Move up/down in list" },
      { key: "Enter", action: "Select / Confirm" },
      { key: "Esc", action: "Cancel / Go back" },
      { key: "q", action: "Quit Paca" },
    ],
  },
  {
    category: "Projects",
    bindings: [
      { key: "n", action: "Create new project" },
      { key: "e", action: "Edit project" },
      { key: "a", action: "Archive/Unarchive" },
      { key: "d", action: "Delete project" },
      { key: "A", action: "Toggle show archived" },
    ],
  },
  {
    category: "Tasks",
    bindings: [
      { key: "n", action: "Create new task" },
      { key: "e", action: "Edit selected task" },
      { key: "Space", action: "Toggle status (cycle)" },
      { key: "p", action: "Change priority" },
      { key: "d", action: "Delete task" },
    ],
  },
  {
    category: "Time Tracking",
    bindings: [
      { key: "t", action: "Start timer" },
      { key: "s", action: "Stop running timer" },
    ],
  },
];

export function HelpView() {
  return (
    <box
      style={{
        flexDirection: "column",
        flexGrow: 1,
        padding: 1,
      }}
    >
      <box style={{ marginBottom: 1 }}>
        <text fg="#64748b">A tui task management and timer</text>
      </box>

      <box
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 2,
          flexGrow: 1,
        }}
      >
        {KEYBINDINGS.map((section) => (
          <box
            key={section.category}
            title={section.category}
            style={{
              border: true,
              borderColor: "#334155",
              padding: 1,
              minWidth: 35,
              flexGrow: 1,
            }}
          >
            {section.bindings.map((binding) => (
              <box
                key={binding.key}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <text>
                  <span fg="#3b82f6" style={{ minWidth: 12 }}>
                    {binding.key}
                  </span>
                </text>
                <text fg="#94a3b8">{binding.action}</text>
              </box>
            ))}
          </box>
        ))}
      </box>

      <box
        style={{
          padding: 1,
        }}
      >
        <text fg="#475569">Database location: ~/.paca/paca.db</text>
      </box>
    </box>
  );
}
