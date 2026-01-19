import type { ReactNode } from "react";
import { useTerminalDimensions } from "@opentui/react";
import type { DashboardStats, Task, WeeklyTimeData } from "../types.ts";
import { COLORS } from "../types.ts";

interface DashboardProps {
	stats: DashboardStats;
	recentTasks: (Task & { project: { name: string; color: string } })[];
	weeklyTimeData: WeeklyTimeData[];
	selectedIndex: number;
	focused: boolean;
}

const STATUS_COLORS = {
	todo: "#64748b",
	inProgress: "#f59e0b",
	done: "#10b981",
};

function StackedBarChart({
	stats,
	width,
}: {
	stats: DashboardStats;
	width: number;
}) {
	const total = stats.totalTasks;
	const barWidth = Math.max(width - 4, 20); // Account for padding/borders

	if (total === 0) {
		return (
			<box style={{ flexDirection: "column", gap: 1, width: "100%" }}>
				<text fg="#334155">{"░".repeat(barWidth)}</text>
				<text fg="#334155">{"░".repeat(barWidth)}</text>
				<text fg="#64748b">No tasks yet</text>
			</box>
		);
	}

	// Calculate widths for each segment
	const doneWidth = Math.round((stats.doneTasks / total) * barWidth);
	const inProgressWidth = Math.round(
		(stats.inProgressTasks / total) * barWidth,
	);
	const todoWidth = barWidth - doneWidth - inProgressWidth;

	// Build the bar string
	const barLine =
		"█".repeat(doneWidth) + "█".repeat(inProgressWidth) + "█".repeat(todoWidth);

	return (
		<box style={{ flexDirection: "column", gap: 1, width: "100%" }}>
			{/* The stacked bar - multiple lines for height */}
			<text>
				<span fg={STATUS_COLORS.done}>{"█".repeat(doneWidth)}</span>
				<span fg={STATUS_COLORS.inProgress}>{"█".repeat(inProgressWidth)}</span>
				<span fg={STATUS_COLORS.todo}>{"█".repeat(todoWidth)}</span>
			</text>
			<text>
				<span fg={STATUS_COLORS.done}>{"█".repeat(doneWidth)}</span>
				<span fg={STATUS_COLORS.inProgress}>{"█".repeat(inProgressWidth)}</span>
				<span fg={STATUS_COLORS.todo}>{"█".repeat(todoWidth)}</span>
			</text>

			{/* Legend */}
			<box style={{ flexDirection: "row", gap: 3, marginTop: 1 }}>
				<text>
					<span fg={STATUS_COLORS.done}>●</span>
					<span fg="#94a3b8"> Done </span>
					<span fg="#ffffff" attributes="bold">
						{stats.doneTasks}
					</span>
				</text>
				<text>
					<span fg={STATUS_COLORS.inProgress}>●</span>
					<span fg="#94a3b8"> In Progress </span>
					<span fg="#ffffff" attributes="bold">
						{stats.inProgressTasks}
					</span>
				</text>
				<text>
					<span fg={STATUS_COLORS.todo}>●</span>
					<span fg="#94a3b8"> To Do </span>
					<span fg="#ffffff" attributes="bold">
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

// Distinct color palette for chart bars
const CHART_COLORS = [
	"#3b82f6", // Blue
	"#10b981", // Green
	"#f59e0b", // Amber
	"#ef4444", // Red
	"#8b5cf6", // Purple
	"#ec4899", // Pink
	"#06b6d4", // Cyan
	"#f97316", // Orange
	"#84cc16", // Lime
	"#6366f1", // Indigo
];

function WeeklyTimeChart({
	data,
	width,
}: {
	data: WeeklyTimeData[];
	width: number;
}) {
	const chartWidth = Math.max(width - 4, 40);
	const maxBars = Math.min(data.length, Math.floor(chartWidth / 3)); // Each bar needs ~3 chars min
	const recentData = data.slice(-maxBars);

	if (recentData.length === 0) {
		return (
			<box style={{ flexDirection: "column", gap: 1, width: "100%" }}>
				<text fg="#64748b">No time entries in the last 6 months</text>
			</box>
		);
	}

	// Find max hours for scaling
	const maxMs = Math.max(...recentData.map((d) => d.totalMs), 1);
	const barHeight = 6; // Height of bars in rows

	// Calculate bar width based on available space
	const barWidth = Math.max(2, Math.floor((chartWidth - 8) / recentData.length) - 1);

	// Collect unique projects for legend (sorted by total time across all weeks)
	const projectTotals = new Map<string, { name: string; color: string; totalMs: number }>();
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
	const sortedProjects = Array.from(projectTotals.entries())
		.sort((a, b) => b[1].totalMs - a[1].totalMs);

	// Assign dynamic colors to each project based on their sorted position
	const projectColorMap = new Map<string, string>();
	sortedProjects.forEach(([projectId], index) => {
		projectColorMap.set(projectId, CHART_COLORS[index % CHART_COLORS.length]!);
	});

	// Build bars row by row (from top to bottom)
	const rows: ReactNode[] = [];
	for (let row = barHeight - 1; row >= 0; row--) {
		const rowParts: ReactNode[] = [];

		for (let i = 0; i < recentData.length; i++) {
			const week = recentData[i]!;
			const barTotalRows = Math.round((week.totalMs / maxMs) * barHeight);

			if (row < barTotalRows) {
				// This row should be filled - determine which project's color
				// Sort this week's projects by the global order for consistent stacking
				const weekProjects = [...week.projects].sort((a, b) => {
					const aIdx = sortedProjects.findIndex(([id]) => id === a.projectId);
					const bIdx = sortedProjects.findIndex(([id]) => id === b.projectId);
					return aIdx - bIdx;
				});

				// Calculate which project this row belongs to (stacked from bottom)
				let cumulativeRows = 0;
				let projectColor = CHART_COLORS[0]!;

				for (const proj of weekProjects) {
					const projRows = Math.round((proj.ms / week.totalMs) * barTotalRows);
					if (row < cumulativeRows + projRows) {
						projectColor = projectColorMap.get(proj.projectId) || CHART_COLORS[0]!;
						break;
					}
					cumulativeRows += projRows;
					// If we've gone through all projects, use the last one's color
					projectColor = projectColorMap.get(proj.projectId) || CHART_COLORS[0]!;
				}

				rowParts.push(
					<span key={i} fg={projectColor}>
						{"█".repeat(barWidth)}
					</span>,
				);
			} else {
				rowParts.push(
					<span key={i} fg="#1e293b">
						{" ".repeat(barWidth)}
					</span>,
				);
			}
			// Add space between bars
			if (i < recentData.length - 1) {
				rowParts.push(<span key={`sp-${i}`}> </span>);
			}
		}

		rows.push(
			<text key={row}>
				{rowParts}
			</text>,
		);
	}

	// X-axis labels (week labels)
	const labelParts: ReactNode[] = [];
	for (let i = 0; i < recentData.length; i++) {
		const week = recentData[i]!;
		const label = week.weekLabel.slice(0, barWidth + 1).padEnd(barWidth, " ");
		labelParts.push(
			<span key={i} fg="#64748b">
				{label}
			</span>,
		);
		if (i < recentData.length - 1) {
			labelParts.push(<span key={`sp-${i}`}> </span>);
		}
	}

	// Calculate total hours for display
	const totalMs = recentData.reduce((sum, w) => sum + w.totalMs, 0);

	return (
		<box style={{ flexDirection: "column", gap: 1, width: "100%" }}>
			{/* Y-axis scale indicator */}
			<text fg="#64748b">
				{formatHours(maxMs)} max
			</text>

			{/* Bars */}
			{rows}

			{/* X-axis labels */}
			<text>{labelParts}</text>

			{/* Legend - show top projects by time */}
			<box style={{ flexDirection: "row", gap: 2, marginTop: 1, flexWrap: "wrap" }}>
				{sortedProjects
					.slice(0, 4)
					.map(([id, proj]) => (
						<text key={id}>
							<span fg={projectColorMap.get(id)}>●</span>
							<span fg="#94a3b8"> {proj.name.slice(0, 12)}</span>
						</text>
					))}
				<text>
					<span fg="#94a3b8">Total: </span>
					<span fg="#ffffff" attributes="bold">
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
}: DashboardProps) {
	const { width: termWidth } = useTerminalDimensions();

	const getStatusColor = (status: string) => {
		switch (status) {
			case "done":
				return "#10b981";
			case "in_progress":
				return "#f59e0b";
			default:
				return "#64748b";
		}
	};

	const getPriorityIndicator = (
		priority: string,
	): { symbol: string; color: string } => {
		const indicators: Record<string, { symbol: string; color: string }> = {
			urgent: { symbol: "!", color: "#ef4444" },
			high: { symbol: "!", color: "#f59e0b" },
			medium: { symbol: "!", color: "#3b82f6" },
			low: { symbol: " ", color: "#64748b" },
		};
		return indicators[priority] ?? { symbol: "!", color: "#3b82f6" };
	};

	return (
		<box
			style={{
				flexDirection: "column",
				flexGrow: 1,
				padding: 1,
				gap: 1,
			}}
		>
			{/* Progress Section */}
			<box
				title="Task Status"
				style={{
					border: true,
					borderColor: "#334155",
					padding: 1,
					flexDirection: "column",
					width: "100%",
				}}
			>
				<StackedBarChart stats={stats} width={termWidth} />
			</box>

			{/* Weekly Time Chart */}
			<box
				title="Weekly Time (6 Months)"
				style={{
					border: true,
					borderColor: "#334155",
					padding: 1,
					flexDirection: "column",
					width: "100%",
				}}
			>
				<WeeklyTimeChart data={weeklyTimeData} width={termWidth} />
			</box>

			{/* Recent Activity */}
			<box
				title="Recent Activity"
				style={{
					border: true,
					borderColor: COLORS.borderOff,
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
						<text fg="#64748b">No recent activity</text>
						<text fg="#475569">Create a project to get started!</text>
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
												? COLORS.selectedRowBg
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
															? "#64748b"
															: isSelected
																? "#ffffff"
																: "#e2e8f0"
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
												<span fg="#64748b"> in </span>
												<span fg={task.project.color}>{task.project.name}</span>
											</text>
										</box>
										<text fg="#475569">
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
