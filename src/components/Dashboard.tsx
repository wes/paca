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
	// Braille chars filled bottom-up (both columns): ⠀ ⣀ ⣤ ⣶ ⣿
	const brailleBlocks = [
		String.fromCodePoint(0x2800), // 0/4 empty
		String.fromCodePoint(0x28c0), // 1/4 dots 7,8
		String.fromCodePoint(0x28e4), // 2/4 dots 3,6,7,8
		String.fromCodePoint(0x28f6), // 3/4 dots 2,3,5,6,7,8
		String.fromCodePoint(0x28ff), // 4/4 all dots
	];

	// Available width after parent padding (2 per side)
	const availableWidth = Math.max(width - 4, 16);
	const chartHeight = 8; // character rows for bar area (8 × 4 = 32 levels)
	const gap = 1;
	const minBarWidth = 2;
	const maxBarWidth = 10;
	const maxWeeks = 25;

	// Determine how many bars fit
	const maxBars = Math.min(
		data.length,
		maxWeeks,
		Math.floor((availableWidth + gap) / (minBarWidth + gap)),
	);
	const recentData = data.slice(-maxBars);

	if (recentData.length === 0) {
		return (
			<box style={{ flexDirection: "column", gap: 1, width: "100%" }}>
				<text fg={colors.textSecondary}>
					No time entries in the last 6 months
				</text>
			</box>
		);
	}

	// Dynamic bar width to fill available space, capped
	const barWidth = Math.min(
		maxBarWidth,
		Math.max(
			minBarWidth,
			Math.floor(
				(availableWidth - (recentData.length - 1) * gap) / recentData.length,
			),
		),
	);

	// Collect unique projects for legend (sorted by total time)
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
	const sortedProjects = Array.from(projectTotals.entries()).sort(
		(a, b) => b[1].totalMs - a[1].totalMs,
	);

	const projectColorMap = new Map<string, string>();
	sortedProjects.forEach(([projectId], index) => {
		projectColorMap.set(projectId, chartColors[index % chartColors.length]!);
	});

	// Pre-sort each week's projects by global order for consistent stacking
	const weekProjectsSorted = recentData.map((week) =>
		[...week.projects].sort((a, b) => {
			const aIdx = sortedProjects.findIndex(([id]) => id === a.projectId);
			const bIdx = sortedProjects.findIndex(([id]) => id === b.projectId);
			return aIdx - bIdx;
		}),
	);

	const maxMs = Math.max(...recentData.map((d) => d.totalMs), 1);

	// Build each bar column: array of {char, color} from row 0 (bottom) to top
	const barColumns = recentData.map((week, weekIdx) => {
		const totalFourths = Math.round(
			(week.totalMs / maxMs) * chartHeight * 4,
		);
		const weekProjects = weekProjectsSorted[weekIdx]!;
		const cells: Array<{ char: string; color: string }> = [];

		for (let row = 0; row < chartHeight; row++) {
			const rowBottom = row * 4;
			const fill = Math.min(Math.max(totalFourths - rowBottom, 0), 4);

			if (fill === 0) {
				cells.push({ char: " ", color: colors.textMuted });
			} else {
				// Find project color at midpoint of filled portion of this row
				const midFourths = rowBottom + fill / 2;
				const midFraction =
					totalFourths > 0 ? midFourths / totalFourths : 0;
				let cumFraction = 0;
				let color = chartColors[0]!;
				for (const proj of weekProjects) {
					cumFraction += proj.ms / week.totalMs;
					if (midFraction <= cumFraction) {
						color =
							projectColorMap.get(proj.projectId) || chartColors[0]!;
						break;
					}
				}
				cells.push({ char: brailleBlocks[fill]!, color });
			}
		}
		return cells;
	});

	// Render a label row where labels can extend beyond bar width.
	// Labels are centered on their bar position and skipped if they'd overlap.
	function buildLabelRow(
		labels: string[],
		color: string,
		key: string,
	): ReactNode {
		const totalWidth =
			labels.length * barWidth + (labels.length - 1) * gap;
		const chars = new Array(totalWidth).fill(" ");

		let lastEnd = -2;
		for (let i = 0; i < labels.length; i++) {
			const label = labels[i]!;
			if (!label) continue;

			const barStart = i * (barWidth + gap);
			const barCenter = barStart + Math.floor(barWidth / 2);
			const labelStart = Math.max(
				0,
				barCenter - Math.floor(label.length / 2),
			);
			const labelEnd = labelStart + label.length;

			if (labelStart > lastEnd && labelEnd <= totalWidth) {
				for (let j = 0; j < label.length; j++) {
					chars[labelStart + j] = label[j];
				}
				lastEnd = labelEnd;
			}
		}

		return (
			<text key={key} fg={color}>
				{chars.join("")}
			</text>
		);
	}

	// Short top labels: rounded hours with no unit
	const topLabels = recentData.map((week) => {
		if (week.totalMs === 0) return "";
		const hours = week.totalMs / 3600000;
		const rounded = Math.round(hours);
		return String(rounded || "<1");
	});

	// Row where each label sits (0-indexed from bottom, just above bar top)
	const barLabelRows = recentData.map((week) => {
		const totalFourths = Math.round(
			(week.totalMs / maxMs) * chartHeight * 4,
		);
		return Math.min(Math.ceil(totalFourths / 4), chartHeight - 1);
	});

	const rows: ReactNode[] = [];

	// Bar rows (top to bottom), with labels embedded on top of each bar
	for (let row = chartHeight - 1; row >= 0; row--) {
		const rowParts: ReactNode[] = [];
		for (let i = 0; i < barColumns.length; i++) {
			const isLast = i === barColumns.length - 1;
			if (row === barLabelRows[i] && topLabels[i]) {
				const label = topLabels[i]!;
				// Use barWidth + gap for centering (absorb trailing gap)
				const slotWidth = isLast ? barWidth : barWidth + gap;
				const padLeft = Math.floor((slotWidth - label.length) / 2);
				const centered =
					" ".repeat(padLeft) +
					label +
					" ".repeat(Math.max(0, slotWidth - padLeft - label.length));
				rowParts.push(
					<span key={i} fg={colors.textSecondary}>
						{centered}
					</span>,
				);
			} else {
				const cell = barColumns[i]![row]!;
				rowParts.push(
					<span key={i} fg={cell.color}>
						{cell.char.repeat(barWidth)}
					</span>,
				);
				if (!isLast) {
					rowParts.push(
						<span key={`sp-${i}`}>{" ".repeat(gap)}</span>,
					);
				}
			}
		}
		rows.push(<text key={`row-${row}`}>{rowParts}</text>);
	}

	// Baseline
	const baselineParts: ReactNode[] = [];
	for (let i = 0; i < recentData.length; i++) {
		baselineParts.push(
			<span key={i} fg={colors.borderSubtle}>
				{"─".repeat(barWidth)}
			</span>,
		);
		if (i < recentData.length - 1) {
			baselineParts.push(
				<span key={`sp-${i}`} fg={colors.borderSubtle}>
					{" ".repeat(gap)}
				</span>,
			);
		}
	}
	rows.push(<text key="baseline">{baselineParts}</text>);

	// Date labels
	const dateLabels = recentData.map((week) => week.weekLabel);
	rows.push(buildLabelRow(dateLabels, colors.textSecondary, "dates"));

	const totalMs = recentData.reduce((sum, w) => sum + w.totalMs, 0);

	return (
		<box style={{ flexDirection: "column", width: "100%" }}>
			{rows}
			{/* Legend */}
			<box
				style={{
					flexDirection: "row",
					gap: 2,
					marginTop: 1,
					flexWrap: "wrap",
				}}
			>
				{sortedProjects.slice(0, 4).map(([id, proj]) => (
					<text key={id}>
						<span fg={projectColorMap.get(id)}>●</span>
						<span fg={colors.textSecondary}>
							{" "}
							{proj.name.slice(0, 12)}
						</span>
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
