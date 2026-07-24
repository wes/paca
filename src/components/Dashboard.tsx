import { useTerminalDimensions } from "@opentui/react";
import type { DashboardStats, Task, WeeklyTimeData, Theme } from "../types.ts";
import { TimeSeriesChart } from "./Charts.tsx";

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


export function Dashboard({
	stats,
	recentTasks,
	weeklyTimeData,
	selectedIndex,
	focused,
	theme,
}: DashboardProps) {
	const { width: termWidth, height: termHeight } = useTerminalDimensions();
	const colors = theme.colors;

	// Shrink the chart on short terminals so the recent-activity list survives.
	const chartHeight = termHeight >= 42 ? 9 : termHeight >= 32 ? 7 : 5;

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
					flexDirection: "column",
					flexShrink: 0,
				}}
			>
				<TimeSeriesChart
					data={weeklyTimeData}
					width={Math.max(termWidth - 4, 16)}
					theme={theme}
					height={chartHeight}
					maxColumns={26}
					emptyMessage="No time entries in the last 6 months"
				/>
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
