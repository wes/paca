import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { CATPPUCCIN_MOCHA, type ProjectWithTaskCounts, type Theme } from "../types.ts";
import { usePaste } from "../hooks/usePaste";
import Modal from "./Modal.tsx";

interface ProjectSelectModalProps {
	projects: ProjectWithTaskCounts[];
	onSelect: (projectId: string) => void;
	onCancel: () => void;
	theme?: Theme;
}

export function ProjectSelectModal({
	projects,
	onSelect,
	onCancel,
	theme = CATPPUCCIN_MOCHA,
}: ProjectSelectModalProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [searchQuery, setSearchQuery] = useState("");
	const inputRef = usePaste();
	const colors = theme.colors;

	const filteredProjects = projects.filter((project) =>
		project.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		setSelectedIndex(0);
	};

	useKeyboard((key) => {
		if (key.name === "escape") {
			onCancel();
			return;
		}
		if (key.name === "return" && filteredProjects[selectedIndex]) {
			onSelect(filteredProjects[selectedIndex].id);
			return;
		}
		if (key.name === "down") {
			setSelectedIndex((i) => Math.min(i + 1, filteredProjects.length - 1));
			return;
		}
		if (key.name === "up") {
			setSelectedIndex((i) => Math.max(i - 1, 0));
			return;
		}
	});

	return (
		<Modal title="Start Timer" height={20} theme={theme}>
			<box
				style={{
					border: true,
					borderColor: colors.borderSubtle,
					height: 3,
					marginBottom: 1,
				}}
			>
				<input
					ref={inputRef}
					placeholder="Search projects..."
					focused
					value={searchQuery}
					onInput={handleSearchChange}
				/>
			</box>
			<box style={{ flexGrow: 1 }}>
				<scrollbox style={{ flexGrow: 1 }}>
					{filteredProjects.length === 0 ? (
						<text fg={colors.textMuted} style={{ paddingLeft: 1 }}>
							No projects found
						</text>
					) : (
						filteredProjects.map((project, index) => (
							<box
								key={project.id}
								style={{
									paddingLeft: 1,
									paddingRight: 1,
									backgroundColor:
										index === selectedIndex ? colors.selectedRowBg : "transparent",
								}}
							>
								<text>
									<span fg={project.color}>[*] </span>
									<span
										fg={index === selectedIndex ? colors.selectedText : colors.textPrimary}
										attributes={index === selectedIndex ? "bold" : undefined}
									>
										{project.name}
									</span>
									{project.hourlyRate != null && (
										<span fg={colors.success}> ${project.hourlyRate}/hr</span>
									)}
								</text>
							</box>
						))
					)}
				</scrollbox>
			</box>
		</Modal>
	);
}

interface StopTimerModalProps {
	projectName: string;
	projectColor: string;
	duration: string;
	onSubmit: (description: string) => void;
	onCancel: () => void;
	theme?: Theme;
}

export function StopTimerModal({
	projectName,
	projectColor,
	duration,
	onSubmit,
	onCancel,
	theme = CATPPUCCIN_MOCHA,
}: StopTimerModalProps) {
	const [description, setDescription] = useState("");
	const inputRef = usePaste();
	const colors = theme.colors;

	return (
		<Modal title="Stop Timer" height={20} theme={theme}>
			<box style={{ flexDirection: "row", gap: 1, marginTop: 0 }}>
				<text fg={colors.error}>{projectName}</text>

				<text fg={colors.warning}>{duration}</text>
			</box>
			<text fg={colors.accentSecondary} style={{ marginTop: 1 }}>
				What did you work on?
			</text>
			<box
				style={{
					border: true,
					borderColor: colors.borderSubtle,
					height: 3,
				}}
			>
				<input
					ref={inputRef}
					placeholder="Description (optional)..."
					focused
					onInput={setDescription}
					onSubmit={() => onSubmit(description)}
				/>
			</box>
			<text fg={colors.textMuted}>Enter to save, Esc to cancel</text>
		</Modal>
	);
}
