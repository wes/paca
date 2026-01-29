import type { Theme } from "../types.ts";

interface StatusBarProps {
	message?: string;
	mode?: string;
	timerRunning?: boolean;
	currentView?: string;
	activePanel?: string;
	theme: Theme;
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
	theme: Theme,
	showAllTimers?: boolean,
	hasOlderWeeks?: boolean,
	hasNewerWeeks?: boolean,
) {
	const colors = theme.colors;
	const baseShortcuts = timerRunning
		? [{ key: "s", action: "Stop Timer", color: colors.error }]
		: [{ key: "t", action: "Timer", color: colors.success }];

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
	theme,
	showAllTimers,
	allTimersWeekRange,
	hasOlderWeeks,
	hasNewerWeeks,
}: StatusBarProps) {
	const colors = theme.colors;
	const shortcuts = getShortCuts(currentView, timerRunning, activePanel, theme, showAllTimers, hasOlderWeeks, hasNewerWeeks);

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
						<span fg={colors.bg} bg={colors.accent}>
							{" "}
							{mode.toUpperCase().replace(/_/g, " ")}{" "}
						</span>
					</text>
				)}
				{shortcuts.map((s) => (
					<text key={s.key}>
						<span fg={s.color || colors.accent}>{s.key}</span>
						<span fg={colors.textSecondary}> {s.action}</span>
					</text>
				))}
			</box>
			<text fg={message?.includes("Error") ? colors.error : colors.textSecondary}>
				{displayMessage || "Ready"}
			</text>
		</box>
	);
}
