import type { Task, Theme } from "../types.ts";
import { STATUS_ICONS, type TaskStatus } from "../types.ts";

interface TaskListProps {
	tasks: Task[];
	selectedIndex: number;
	focused: boolean;
	projectName?: string;
	theme: Theme;
}

export function TaskList({
	tasks,
	selectedIndex,
	focused,
	projectName,
	theme,
}: TaskListProps) {
	const colors = theme.colors;

	const formatDueDate = (date: Date | null) => {
		if (!date) return null;
		const d = new Date(date);
		const now = new Date();
		const diffDays = Math.ceil(
			(d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (diffDays < 0)
			return { text: `${Math.abs(diffDays)}d overdue`, color: colors.error };
		if (diffDays === 0) return { text: "Today", color: colors.warning };
		if (diffDays === 1) return { text: "Tomorrow", color: colors.warning };
		if (diffDays <= 7) return { text: `${diffDays}d`, color: colors.info };
		return {
			text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
			color: colors.textSecondary,
		};
	};

	const getPriorityIndicator = (priority: string) => {
		const indicators: Record<string, { symbol: string; color: string }> = {
			urgent: { symbol: "!", color: colors.priorityUrgent },
			high: { symbol: "!", color: colors.priorityHigh },
			medium: { symbol: "!", color: colors.priorityMedium },
			low: { symbol: " ", color: colors.priorityLow },
		};
		return indicators[priority] || indicators.medium;
	};

	return (
		<box
			title={projectName ? `Tasks - ${projectName}` : "Tasks"}
			style={{
				border: true,
				borderColor: focused ? colors.border : colors.borderOff,
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
					<text fg={colors.textSecondary}>
						{projectName ? "No tasks in this project" : "Select a project"}
					</text>
					{projectName && <text fg={colors.textMuted}>Press 'n' to create a task</text>}
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
										<text
											fg={
												task.status === "done"
													? colors.success
													: task.status === "in_progress"
														? colors.warning
														: colors.textSecondary
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
