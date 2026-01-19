import type { Task } from "../types.ts";
import { STATUS_ICONS, type TaskStatus } from "../types.ts";
import { COLORS } from "../types.ts";

interface TaskListProps {
	tasks: Task[];
	selectedIndex: number;
	focused: boolean;
	projectName?: string;
}

export function TaskList({
	tasks,
	selectedIndex,
	focused,
	projectName,
}: TaskListProps) {
	const formatDueDate = (date: Date | null) => {
		if (!date) return null;
		const d = new Date(date);
		const now = new Date();
		const diffDays = Math.ceil(
			(d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (diffDays < 0)
			return { text: `${Math.abs(diffDays)}d overdue`, color: "#ef4444" };
		if (diffDays === 0) return { text: "Today", color: "#f59e0b" };
		if (diffDays === 1) return { text: "Tomorrow", color: "#f59e0b" };
		if (diffDays <= 7) return { text: `${diffDays}d`, color: "#3b82f6" };
		return {
			text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
			color: "#64748b",
		};
	};

	const getPriorityIndicator = (priority: string) => {
		const indicators: Record<string, { symbol: string; color: string }> = {
			urgent: { symbol: "!", color: "#ef4444" },
			high: { symbol: "!", color: "#f59e0b" },
			medium: { symbol: "!", color: "#3b82f6" },
			low: { symbol: " ", color: "#64748b" },
		};
		return indicators[priority] || indicators.medium;
	};

	return (
		<box
			title={projectName ? `Tasks - ${projectName}` : "Tasks"}
			style={{
				border: true,
				borderColor: focused ? COLORS.border : COLORS.borderOff,
				flexGrow: 2,
				flexDirection: "column",
			}}
		>
			{tasks.length === 0 ? (
				<box
					style={{
						flexGrow: 1,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<text fg="#64748b">
						{projectName ? "No tasks in this project" : "Select a project"}
					</text>
					{projectName && <text fg="#475569">Press 'n' to create a task</text>}
				</box>
			) : (
				<scrollbox focused={focused} style={{ flexGrow: 1 }}>
					{tasks.map((task, index) => {
						const isSelected = index === selectedIndex;
						const statusIcon = STATUS_ICONS[task.status as TaskStatus] || "○";
						const priority = getPriorityIndicator(task.priority);
						const dueInfo = formatDueDate(task.dueDate);

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
										<text
											fg={
												task.status === "done"
													? "#10b981"
													: task.status === "in_progress"
														? "#f59e0b"
														: "#64748b"
											}
										>
											{statusIcon}{" "}
										</text>
									</box>
									<box style={{ width: 2 }}>
										<text fg={priority.color}>{priority.symbol}</text>
									</box>
									<box style={{ flexGrow: 1 }}>
										<text
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
										</text>
									</box>

									{dueInfo && <text fg={dueInfo.color}>{dueInfo.text}</text>}
								</box>
							</box>
						);
					})}
				</scrollbox>
			)}
		</box>
	);
}
