import type { ProjectWithTaskCounts, Theme } from "../types.ts";

interface ProjectListProps {
	projects: ProjectWithTaskCounts[];
	selectedIndex: number;
	focused: boolean;
	showArchived: boolean;
	theme: Theme;
}

export function ProjectList({
	projects,
	selectedIndex,
	focused,
	showArchived,
	theme,
}: ProjectListProps) {
	const colors = theme.colors;

	const getTaskStats = (project: ProjectWithTaskCounts) => {
		const total = project.tasks.length;
		const done = project.tasks.filter((t) => t.status === "done").length;
		const inProgress = project.tasks.filter(
			(t) => t.status === "in_progress",
		).length;
		return { total, done, inProgress };
	};

	const projectList = projects.sort((a, b) => {
		return a.name.toLowerCase() + b.name.toLowerCase();
	});

	return (
		<box
			title={`Projects${showArchived ? " (incl. archived)" : ""}`}
			style={{
				border: true,
				borderColor: focused ? colors.border : colors.borderOff,
				flexGrow: 1,
				flexDirection: "column",
			}}
		>
			{projectList.length === 0 ? (
				<box
					style={{
						flexGrow: 1,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<text fg={colors.textSecondary}>No projects yet</text>
					<text fg={colors.textMuted}>Press 'n' to create one</text>
				</box>
			) : (
				<scrollbox focused={focused} style={{ flexGrow: 1 }}>
					{projectList.map((project, index) => {
						const isSelected = index === selectedIndex;
						const stats = getTaskStats(project);

						// Dim highlight when not focused, bright when focused
						const bgColor = isSelected
							? focused
								? colors.selectedRowBg
								: colors.surface
							: "transparent";

						return (
							<box
								key={project.id}
								style={{
									width: "100%",
									paddingLeft: 1,
									paddingRight: 1,
									backgroundColor: bgColor,
								}}
							>
								<box
									style={{
										flexDirection: "row",
										justifyContent: "space-between",
									}}
								>
									<text>
										<span fg={project.color}>
											{project.archived ? "[ ] " : "[*] "}
										</span>
										<span
											fg={isSelected ? colors.selectedText : colors.textPrimary}
											attributes={isSelected ? "bold" : undefined}
										>
											{project.name}
										</span>
										{project.archived && <span fg={colors.textSecondary}> (archived)</span>}
										{project.hourlyRate != null && (
											<span fg={colors.success}> ${project.hourlyRate}/hr</span>
										)}
									</text>
									<text>
										<span fg={colors.statusDone}>{stats.done}</span>
										<span fg={colors.textSecondary}>/</span>
										<span fg={colors.textSecondary}>{stats.total}</span>
									</text>
								</box>
								{project.description && (
									<text fg={colors.textSecondary} style={{ paddingLeft: 4 }}>
										{project.description.slice(0, 40)}
										{project.description.length > 40 ? "..." : ""}
									</text>
								)}
							</box>
						);
					})}
				</scrollbox>
			)}
		</box>
	);
}
