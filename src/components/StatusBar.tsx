interface StatusBarProps {
	message?: string;
	mode?: string;
	timerRunning?: boolean;
	currentView?: string;
	activePanel?: string;
	// Timesheet-specific props
	showAllTimers?: boolean;
	allTimersWeekRange?: string;
	hasOlderWeeks?: boolean;
	hasNewerWeeks?: boolean;
}

function getShortCuts(
	currentView: string | undefined,
	timerRunning: boolean | undefined,
	activePanel: string | undefined,
	showAllTimers?: boolean,
	hasOlderWeeks?: boolean,
	hasNewerWeeks?: boolean,
) {
	const baseShortcuts = timerRunning
		? [{ key: "s", action: "Stop Timer", color: "#ef4444" }]
		: [{ key: "t", action: "Timer", color: "#10b981" }];

	if (currentView === "timesheets") {
		if (showAllTimers) {
			// All timers mode (paged by week)
			const shortcuts = [
				...baseShortcuts,
				{ key: "a", action: "billable only" },
				{ key: "⇅", action: "navigate" },
			];
			// Only show paging if there are older or newer weeks
			if (hasOlderWeeks || hasNewerWeeks) {
				shortcuts.push({ key: "[]", action: "page weeks" });
			}
			shortcuts.push({ key: "e", action: "edit" });
			shortcuts.push({ key: "d", action: "delete" });
			return shortcuts;
		}
		// Default billable timesheets mode
		return [
			...baseShortcuts,
			{ key: "a", action: "all timers" },
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
	showAllTimers,
	allTimersWeekRange,
	hasOlderWeeks,
	hasNewerWeeks,
}: StatusBarProps) {
	const shortcuts = getShortCuts(currentView, timerRunning, activePanel, showAllTimers, hasOlderWeeks, hasNewerWeeks);

	// Determine message to show - week range takes precedence in all timers mode
	const displayMessage = showAllTimers && allTimersWeekRange ? allTimersWeekRange : message;

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
			<text fg={message?.includes("Error") ? "#ef4444" : "#94a3b8"}>
				{displayMessage || "Ready"}
			</text>
		</box>
	);
}
