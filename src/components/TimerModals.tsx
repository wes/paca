import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { COLORS, type ProjectWithTaskCounts } from "../types.ts";
import { usePaste } from "../hooks/usePaste";
import Modal from "./Modal.tsx";

interface ProjectSelectModalProps {
	projects: ProjectWithTaskCounts[];
	onSelect: (projectId: string) => void;
	onCancel: () => void;
}

export function ProjectSelectModal({
	projects,
	onSelect,
	onCancel,
}: ProjectSelectModalProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);

	useKeyboard((key) => {
		if (key.name === "escape") {
			onCancel();
			return;
		}
		if (key.name === "return" && projects[selectedIndex]) {
			onSelect(projects[selectedIndex].id);
			return;
		}
		if (key.name === "j" || key.name === "down") {
			setSelectedIndex((i) => Math.min(i + 1, projects.length - 1));
			return;
		}
		if (key.name === "k" || key.name === "up") {
			setSelectedIndex((i) => Math.max(i - 1, 0));
			return;
		}
	});

	return (
		<Modal title="Start Timer" height={20}>
			<box style={{ marginTop: 1, flexGrow: 1 }}>
				<scrollbox focused style={{ flexGrow: 1 }}>
					{projects.map((project, index) => (
						<box
							key={project.id}
							style={{
								paddingLeft: 1,
								paddingRight: 1,
								backgroundColor:
									index === selectedIndex ? "#1e40af" : "transparent",
							}}
						>
							<text>
								<span fg={project.color}>[*] </span>
								<span
									fg={index === selectedIndex ? "#ffffff" : "#e2e8f0"}
									attributes={index === selectedIndex ? "bold" : undefined}
								>
									{project.name}
								</span>
								{project.hourlyRate != null && (
									<span fg="#10b981"> ${project.hourlyRate}/hr</span>
								)}
							</text>
						</box>
					))}
				</scrollbox>
			</box>
			<text fg="#64748b">Enter to select, Esc to cancel</text>
		</Modal>
	);
}

interface StopTimerModalProps {
	projectName: string;
	projectColor: string;
	duration: string;
	onSubmit: (description: string) => void;
	onCancel: () => void;
}

export function StopTimerModal({
	projectName,
	projectColor,
	duration,
	onSubmit,
	onCancel,
}: StopTimerModalProps) {
	const [description, setDescription] = useState("");
	const inputRef = usePaste();

	return (
		<Modal title="Stop Timer" height={20}>
			<box style={{ flexDirection: "row", gap: 1, marginTop: 0 }}>
				<text fg="#ff0000">{projectName}</text>

				<text fg="#f59e0b">{duration}</text>
			</box>
			<text fg="#94a3b8" style={{ marginTop: 1 }}>
				What did you work on?
			</text>
			<box
				style={{
					border: true,
					borderColor: "#475569",
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
			<text fg="#64748b">Enter to save, Esc to cancel</text>
		</Modal>
	);
}
