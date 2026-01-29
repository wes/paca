import type { ReactNode } from "react";
import { useTerminalDimensions } from "@opentui/react";
import type { DashboardStats, Task, WeeklyTimeData, Theme } from "../types.ts";

interface DashboardProps {
	stats: DashboardStats;
	recentTasks: (Task & { project: { name: string; color: string } })[];
	weeklyTimeData: WeeklyTimeData[];
	selectedIndex: number;
	focused: boolean;
	theme: Theme;
}

function StackedBarChart({
	stats,
	width,
	theme,
}: {
	stats: DashboardStats;
	width: number;
	theme: Theme;
}) {
	const colors = theme.colors;
	const statusColors = {
		todo: colors.statusTodo,
		inProgress: colors.statusInProgress,
		done: colors.statusDone,
	};

	const total = stats.totalTasks;
	const barWidth = Math.max(width - 4, 20); // Account for padding/borders

	if (total === 0) {
		return (
			<box style={{ flexDirection: "column", gap: 1, width: "100%" }}>
				<text fg={colors.borderSubtle}>{"░".repeat(barWidth)}</text>
				<text fg={colors.borderSubtle}>{"░".repeat(barWidth)}</text>
				<text fg={colors.textSecondary}>No tasks yet</text>
			</box>
		);
	}

	// Calculate widths for each segment
	const doneWidth = Math.round((stats.doneTasks / total) * barWidth);
	const inProgressWidth = Math.round(
		(stats.inProgressTasks / total) * barWidth,
	);
	const todoWidth = barWidth - doneWidth - inProgressWidth;

	return (
		<box style={{ flexDirection: "column", gap: 1, width: "100%" }}>
			{/* The stacked bar - multiple lines for height */}
			<text>
				<span fg={statusColors.done}>{"█".repeat(doneWidth)}</span>
				<span fg={statusColors.inProgress}>{"█".repeat(inProgressWidth)}</span>
				<span fg={statusColors.todo}>{"█".repeat(todoWidth)}</span>
			</text>
			<text>
				<span fg={statusColors.done}>{"█".repeat(doneWidth)}</span>
				<span fg={statusColors.inProgress}>{"█".repeat(inProgressWidth)}</span>
				<span fg={statusColors.todo}>{"█".repeat(todoWidth)}</span>
			</text>

			{/* Legend */}
			<box style={{ flexDirection: "row", gap: 3, marginTop: 1 }}>
				<text>
					<span fg={statusColors.done}>●</span>
					<span fg={colors.textSecondary}> Done </span>
					<span fg={colors.textPrimary} attributes="bold">
						{stats.doneTasks}
					</span>
				</text>
				<text>
					<span fg={statusColors.inProgress}>●</span>
					<span fg={colors.textSecondary}> In Progress </span>
					<span fg={colors.textPrimary} attributes="bold">
						{stats.inProgressTasks}
					</span>
				</text>
				<text>
					<span fg={statusColors.todo}>●</span>
					<span fg={colors.textSecondary}> To Do </span>
					<span fg={colors.textPrimary} attributes="bold">
						{stats.todoTasks}
					</span>
				</text>
			</box>
		</box>
	);
}

function formatHours(ms: number): string {
	const hours = ms / 3600000;
	if (hours < 1) {
		const minutes = Math.round(ms / 60000);
		return `${minutes}m`;
	}
	return `${hours.toFixed(1)}h`;
}

function WeeklyTimeChart({
	data,
	width,
	theme,
}: {
	data: WeeklyTimeData[];
	width: number;
	theme: Theme;
}) {
	const colors = theme.colors;
	const chartColors = theme.projectColors;
	const chartWidth = Math.max(width + 4, 40);
	const maxBars = Math.min(data.length, 25, Math.floor(chartWidth / 3)); // Each bar needs ~3 chars min, max 25 weeks
	const recentData = data.slice(-maxBars);

	if (recentData.length === 0) {
		return (
			<box style={{ flexDirection: "column", gap: 1, width: "100%" }}>
				<text fg={colors.textSecondary}>No time entries in the last 6 months</text>
			</box>
		);
	}

	// Find max hours for scaling
	const maxMs = Math.max(...recentData.map((d) => d.totalMs), 1);
	const barHeight = 5; // Height of bars in rows

	// Calculate bar width to fill available space
	// Total width = (barWidth * n) + (n - 1) spaces = chartWidth
	// barWidth = (chartWidth - n + 1) / n

	const barWidth = 4;

	// Collect unique projects for legend (sorted by total time across all weeks)
	const projectTotals = new Map<
		string,
		{ name: string; color: string; totalMs: number }
	>();
	for (const week of recentData) {
		for (const p of week.projects) {
			const existing = projectTotals.get(p.projectId);
			if (existing) {
				existing.totalMs += p.ms;
			} else {
				projectTotals.set(p.projectId, {
					name: p.projectName,
					color: p.projectColor,
					totalMs: p.ms,
				});
			}
		}
	}
	// Sort projects by total time (descending) for consistent stacking order
	const sortedProjects = Array.from(projectTotals.entries()).sort(
		(a, b) => b[1].totalMs - a[1].totalMs,
	);

	// Assign dynamic colors to each project based on their sorted position
	const projectColorMap = new Map<string, string>();
	sortedProjects.forEach(([projectId], index) => {
		projectColorMap.set(projectId, chartColors[index % chartColors.length]!);
	});

	// Pre-sort each week's projects by the global order for consistent stacking
	const weekProjectsSorted = recentData.map((week) =>
		[...week.projects].sort((a, b) => {
			const aIdx = sortedProjects.findIndex(([id]) => id === a.projectId);
			const bIdx = sortedProjects.findIndex(([id]) => id === b.projectId);
			return aIdx - bIdx;
		}),
	);

	// Pre-calculate bar heights for label positioning
	const barHeights = recentData.map((week) =>
		Math.round((week.totalMs / maxMs) * barHeight),
	);

	// Build bars row by row (from top to bottom, +1 row for labels on tallest bars)
	const rows: ReactNode[] = [];
	for (let row = barHeight; row >= 0; row--) {
		const rowParts: ReactNode[] = [];

		for (let i = 0; i < recentData.length; i++) {
			const week = recentData[i]!;
			const barTotalRows = barHeights[i]!;

			if (row < barTotalRows) {
				// This row should be filled - determine which project's color
				// Use fraction-based calculation to avoid rounding errors
				const rowFraction = (row + 0.5) / barTotalRows;
				const weekProjects = weekProjectsSorted[i]!;

				// Find which project this row belongs to based on cumulative fraction
				let cumulativeFraction = 0;
				let projectColor = chartColors[0]!;

				for (const proj of weekProjects) {
					const projFraction = proj.ms / week.totalMs;
					cumulativeFraction += projFraction;
					if (rowFraction <= cumulativeFraction) {
						projectColor =
							projectColorMap.get(proj.projectId) || chartColors[0]!;
						break;
					}
				}

				rowParts.push(
					<span key={i} fg={projectColor}>
						{"█".repeat(barWidth)}
					</span>,
				);
			} else if (row === barTotalRows && week.totalMs > 0) {
				// Show hour label just above the bar (centered)
				const label = formatHours(week.totalMs);
				const trimmed = label.slice(0, barWidth);
				const padLeft = Math.floor((barWidth - trimmed.length) / 2);
				const centered =
					" ".repeat(padLeft) +
					trimmed +
					" ".repeat(barWidth - padLeft - trimmed.length);
				rowParts.push(
					<span key={i} fg={colors.textSecondary}>
						{centered}
					</span>,
				);
			} else {
				rowParts.push(<span key={i}>{" ".repeat(barWidth)}</span>);
			}
			// Add space between bars
			if (i < recentData.length - 1) {
				rowParts.push(<span key={`sp-${i}`}> </span>);
			}
		}

		rows.push(<text key={row}>{rowParts}</text>);
	}

	// Calculate total hours for display
	const totalMs = recentData.reduce((sum, w) => sum + w.totalMs, 0);

	// Build date labels row
	const dateLabelParts: ReactNode[] = [];
	for (let i = 0; i < recentData.length; i++) {
		const week = recentData[i]!;
		const trimmed = week.weekLabel.slice(0, barWidth);
		const padLeft = Math.floor((barWidth - trimmed.length) / 2);
		const centered =
			" ".repeat(padLeft) +
			trimmed +
			" ".repeat(barWidth - padLeft - trimmed.length);
		dateLabelParts.push(
			<span key={i} fg={colors.textSecondary}>
				{centered}
			</span>,
		);
		if (i < recentData.length - 1) {
			dateLabelParts.push(<span key={`sp-${i}`}> </span>);
		}
	}

	return (
		<box style={{ flexDirection: "column", gap: 1, width: "100%" }}>
			{/* Bars (with hour labels at top) */}
			{rows}
			{/* Date labels */}
			<text>{dateLabelParts}</text>

			{/* Legend - show top projects by time */}
			<box
				style={{ flexDirection: "row", gap: 2, marginTop: 1, flexWrap: "wrap" }}
			>
				{sortedProjects.slice(0, 4).map(([id, proj]) => (
					<text key={id}>
						<span fg={projectColorMap.get(id)}>●</span>
						<span fg={colors.textSecondary}> {proj.name.slice(0, 12)}</span>
					</text>
				))}
				<text>
					<span fg={colors.textSecondary}>Total: </span>
					<span fg={colors.textPrimary} attributes="bold">
						{formatHours(totalMs)}
					</span>
				</text>
			</box>
		</box>
	);
}

export function Dashboard({
	stats,
	recentTasks,
	weeklyTimeData,
	selectedIndex,
	focused,
	theme,
}: DashboardProps) {
	const { width: termWidth } = useTerminalDimensions();
	const colors = theme.colors;

	const getStatusColor = (status: string) => {
		switch (status) {
			case "done":
				return colors.statusDone;
			case "in_progress":
				return colors.statusInProgress;
			default:
				return colors.statusTodo;
		}
	};

	const getPriorityIndicator = (
		priority: string,
	): { symbol: string; color: string } => {
		const indicators: Record<string, { symbol: string; color: string }> = {
			urgent: { symbol: "!", color: colors.priorityUrgent },
			high: { symbol: "!", color: colors.priorityHigh },
			medium: { symbol: "!", color: colors.priorityMedium },
			low: { symbol: " ", color: colors.priorityLow },
		};
		return indicators[priority] ?? { symbol: "!", color: colors.priorityMedium };
	};

	return (
		<box
			style={{
				flexDirection: "column",
				flexGrow: 1,
				padding: 2,
				gap: 3,
			}}
		>
			{/* Progress Section */}
			<box title="Task Status">
				<StackedBarChart stats={stats} width={termWidth} theme={theme} />
			</box>

			{/* Weekly Time Chart */}
			<box
				title="Weekly Time"
				style={{
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<WeeklyTimeChart data={weeklyTimeData} width={termWidth} theme={theme} />
			</box>

			{/* Recent Activity */}
			<box
				title="Recent Activity"
				style={{
					border: true,
					borderColor: colors.borderOff,
					flexGrow: 1,
					flexDirection: "column",
				}}
			>
				{recentTasks.length === 0 ? (
					<box
						style={{
							flexGrow: 1,
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<text fg={colors.textSecondary}>No recent activity</text>
						<text fg={colors.textMuted}>Create a project to get started!</text>
					</box>
				) : (
					<scrollbox focused={focused} style={{ flexGrow: 1 }}>
						{recentTasks.map((task, index) => {
							const isSelected = index === selectedIndex;
							const priority = getPriorityIndicator(task.priority);

							return (
								<box
									key={task.id}
									style={{
										width: "100%",
										paddingLeft: 1,
										paddingRight: 1,
										backgroundColor:
											isSelected && focused
												? colors.selectedRowBg
												: "transparent",
									}}
								>
									<box
										style={{
											flexDirection: "row",
											justifyContent: "space-between",
										}}
									>
										<box style={{ width: 2 }}>
											<text fg={getStatusColor(task.status)}>
												{task.status === "done"
													? "●"
													: task.status === "in_progress"
														? "◐"
														: "○"}{" "}
											</text>
										</box>
										<box style={{ width: 2 }}>
											<text fg={priority.color}>{priority.symbol}</text>
										</box>
										<box style={{ flexGrow: 1 }}>
											<text>
												<span
													fg={
														task.status === "done"
															? colors.textSecondary
															: isSelected
																? colors.selectedText
																: colors.textPrimary
													}
													attributes={
														task.status === "done"
															? "strikethrough"
															: isSelected
																? "bold"
																: undefined
													}
												>
													{task.title}
												</span>
												<span fg={colors.textSecondary}> in </span>
												<span fg={task.project.color}>{task.project.name}</span>
											</text>
										</box>
										<text fg={colors.textMuted}>
											{new Date(task.updatedAt).toLocaleDateString("en-US", {
												month: "short",
												day: "numeric",
											})}
										</text>
									</box>
								</box>
							);
						})}
					</scrollbox>
				)}
			</box>
		</box>
	);
}
