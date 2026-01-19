interface StatusBarProps {
	message?: string;
	mode?: string;
	timerRunning?: boolean;
	currentView?: string;
	activePanel?: string;
}

function getShortCuts(
	currentView: string | undefined,
	timerRunning: boolean | undefined,
	activePanel: string | undefined,
) {
	const baseShortcuts = timerRunning
		? [{ key: "s", action: "Stop Timer", color: "#ef4444" }]
		: [{ key: "t", action: "Timer", color: "#10b981" }];

	if (currentView === "timesheets") {
		return [
			...baseShortcuts,
			{ key: "⇅", action: "navigate" },
			{ key: "e", action: "edit" },
			{ key: "d", action: "delete" },
			{ key: "_", action: "select" },
			{ key: "i", action: "create invoice" },
		];
	}

	if (currentView === "invoices") {
		return [
			...baseShortcuts,
			{ key: "⇅", action: "navigate" },
			{ key: "↵", action: "open in Stripe" },
			{ key: "p", action: "public URL" },
			{ key: "r", action: "refresh" },
			{ key: "[]", action: "page" },
		];
	}

	if (currentView === "settings") {
		return [...baseShortcuts];
	}

	return [
		...baseShortcuts,
		{ key: "n", action: "New" },
		{ key: "e", action: "Edit" },
		{ key: "Tab", action: "Panel" },
		{ key: "q", action: "Quit" },
	];
}

export function StatusBar({
	message,
	mode,
	timerRunning,
	currentView,
	activePanel,
}: StatusBarProps) {
	const shortcuts = getShortCuts(currentView, timerRunning, activePanel);

	return (
		<box
			style={{
				width: "100%",
				height: 1,
				flexDirection: "row",
				justifyContent: "space-between",
				paddingLeft: 1,
				paddingRight: 1,
			}}
		>
			<box style={{ flexDirection: "row", gap: 2 }}>
				{mode && (
					<text>
						<span fg="#000000" bg="#f59e0b">
							{" "}
							{mode.toUpperCase().replace(/_/g, " ")}{" "}
						</span>
					</text>
				)}
				{shortcuts.map((s) => (
					<text key={s.key}>
						<span fg={s.color || "#3b82f6"}>{s.key}</span>
						<span fg="#64748b"> {s.action}</span>
					</text>
				))}
			</box>
			<text fg={message?.includes("Error") ? "#ef4444" : "#10b981"}>
				{message || "Ready"}
			</text>
		</box>
	);
}
