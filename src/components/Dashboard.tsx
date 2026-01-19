import { useTerminalDimensions } from "@opentui/react";
import type { DashboardStats, Task } from "../types.ts";
import { COLORS } from "../types.ts";

interface DashboardProps {
	stats: DashboardStats;
	recentTasks: (Task & { project: { name: string; color: string } })[];
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

export function Dashboard({
	stats,
	recentTasks,
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
