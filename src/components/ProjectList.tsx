import type { ProjectWithTaskCounts } from "../types.ts";
import { COLORS } from "../types";

interface ProjectListProps {
	projects: ProjectWithTaskCounts[];
	selectedIndex: number;
	focused: boolean;
	showArchived: boolean;
}

export function ProjectList({
	projects,
	selectedIndex,
	focused,
	showArchived,
}: ProjectListProps) {
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
				borderColor: focused ? COLORS.border : COLORS.borderOff,
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
					<text fg="#64748b">No projects yet</text>
					<text fg="#475569">Press 'n' to create one</text>
				</box>
			) : (
				<scrollbox focused={focused} style={{ flexGrow: 1 }}>
					{projectList.map((project, index) => {
						const isSelected = index === selectedIndex;
						const stats = getTaskStats(project);

						// Dim highlight when not focused, bright when focused
						const bgColor = isSelected
							? focused
								? COLORS.selectedRowBg
								: "#252560" // Muted version of selectedRowBg
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
											fg={isSelected ? "#ffffff" : "#e2e8f0"}
											attributes={isSelected ? "bold" : undefined}
										>
											{project.name}
										</span>
										{project.archived && <span fg="#64748b"> (archived)</span>}
										{project.hourlyRate != null && (
											<span fg="#10b981"> ${project.hourlyRate}/hr</span>
										)}
									</text>
									<text>
										<span fg="#10b981">{stats.done}</span>
										<span fg="#64748b">/</span>
										<span fg="#94a3b8">{stats.total}</span>
									</text>
								</box>
								{project.description && (
									<text fg="#64748b" style={{ paddingLeft: 4 }}>
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
