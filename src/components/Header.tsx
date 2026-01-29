import { useState, useEffect } from "react";
import type { View, RunningTimer, Theme } from "../types.ts";
import { Timer } from "./Timer.tsx";

interface HeaderProps {
	currentView: View;
	onViewChange: (view: View) => void;
	runningTimer: RunningTimer | null;
	onStopTimer: () => void;
	theme: Theme;
}

const VIEWS: { key: View; label: string; shortcut: string }[] = [
	{ key: "dashboard", label: "dash", shortcut: "1" },
	{ key: "tasks", label: "tasks", shortcut: "2" },
	{ key: "timesheets", label: "sheets", shortcut: "3" },
	{ key: "invoices", label: "invoices", shortcut: "4" },
	{ key: "settings", label: "settings", shortcut: "5" },
	{ key: "help", label: "help", shortcut: "?" },
];

export function Header({
	currentView,
	runningTimer,
	onStopTimer,
	theme,
}: HeaderProps) {
	const colors = theme.colors;

	return (
		<box
			style={{
				width: "100%",
				flexDirection: "column",
			}}
		>
			{/* Main header row */}
			<box
				style={{
					width: "100%",
					height: 1,
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "center",
					paddingLeft: 1,
					paddingRight: 1,
				}}
			>
				<box
					style={{
						flexDirection: "row",
						gap: 2,
						alignItems: "center",
					}}
				>
					{VIEWS.map((view) => (
						<text key={view.key}>
							<span fg={colors.accent}>{view.shortcut} </span>
							<span fg={currentView === view.key ? colors.textPrimary : colors.textSecondary}>
								{view.label}
							</span>
						</text>
					))}
				</box>
				<Timer runningTimer={runningTimer} onStop={onStopTimer} theme={theme} />
			</box>
		</box>
	);
}
