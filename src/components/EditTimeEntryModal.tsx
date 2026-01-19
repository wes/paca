import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { COLORS, type TimeEntry } from "../types";
import Modal from "./Modal";
import { DateTimePicker } from "./DateTimePicker";
import { usePaste } from "../hooks/usePaste";

interface EditTimeEntryModalProps {
	entry: TimeEntry & {
		project: { name: string; color: string; hourlyRate: number | null };
	};
	timezone: string;
	onSubmit: (startTime: Date, endTime: Date, description: string) => void;
	onCancel: () => void;
}

function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
}

type ActiveSection = "start" | "end" | "description";

export function EditTimeEntryModal({
	entry,
	timezone,
	onSubmit,
	onCancel,
}: EditTimeEntryModalProps) {
	const startDate =
		entry.startTime instanceof Date
			? entry.startTime
			: new Date(entry.startTime);
	const endDate = entry.endTime
		? entry.endTime instanceof Date
			? entry.endTime
			: new Date(entry.endTime)
		: new Date();

	const [startTime, setStartTime] = useState(startDate);
	const [endTime, setEndTime] = useState(endDate);
	const [description, setDescription] = useState(entry.description ?? "");
	const [activeSection, setActiveSection] = useState<ActiveSection>("description");
	const [error, setError] = useState<string | null>(null);
	const descriptionInputRef = usePaste();

	const startPicker = DateTimePicker({
		value: startTime,
		timezone,
		focused: activeSection === "start",
		onChange: (date) => {
			setStartTime(date);
			setError(null);
		},
	});

	const endPicker = DateTimePicker({
		value: endTime,
		timezone,
		focused: activeSection === "end",
		onChange: (date) => {
			setEndTime(date);
			setError(null);
		},
	});

	useKeyboard((key) => {
		if (key.name === "escape") {
			onCancel();
			return;
		}

		// Submit on Enter from any section
		if (key.name === "return") {
			handleSubmit();
			return;
		}

		// Switch between sections with Shift+Tab or specific keys
		if (key.shift && key.name === "tab") {
			setActiveSection((s) => {
				if (s === "description") return "end";
				if (s === "end") return "start";
				return "description";
			});
			return;
		}

		// Handle date picker navigation when in start/end sections
		if (activeSection === "start" || activeSection === "end") {
			const picker = activeSection === "start" ? startPicker : endPicker;

			// Navigate within picker
			if (key.name === "tab" && !key.shift) {
				// Check if we're at the last field of the picker
				const currentIdx = picker.fields.indexOf(picker.activeField);
				if (currentIdx === picker.fields.length - 1) {
					// Move to next section
					setActiveSection(activeSection === "start" ? "end" : "description");
				} else {
					picker.handleKey("tab");
				}
				return;
			}

			if (key.name === "left" || key.name === "h") {
				const currentIdx = picker.fields.indexOf(picker.activeField);
				if (currentIdx === 0 && activeSection === "end") {
					setActiveSection("start");
					startPicker.setActiveField("ampm");
				} else {
					picker.handleKey("left");
				}
				return;
			}

			if (key.name === "right" || key.name === "l") {
				const currentIdx = picker.fields.indexOf(picker.activeField);
				if (currentIdx === picker.fields.length - 1) {
					if (activeSection === "start") {
						setActiveSection("end");
						endPicker.setActiveField("month");
					} else {
						setActiveSection("description");
					}
				} else {
					picker.handleKey("right");
				}
				return;
			}

			if (
				key.name === "up" ||
				key.name === "k" ||
				key.name === "down" ||
				key.name === "j"
			) {
				picker.handleKey(key.name);
				return;
			}
		}

		// Handle description field navigation
		if (activeSection === "description") {
			if (key.name === "tab" && !key.shift) {
				setActiveSection("start");
				return;
			}
			if (key.name === "left" || key.name === "h") {
				// Let the input handle cursor movement
				return;
			}
		}
	});

	const handleSubmit = () => {
		if (endTime <= startTime) {
			setError("End time must be after start time");
			return;
		}

		onSubmit(startTime, endTime, description.trim());
	};

	// Calculate original duration
	const originalEndDate = entry.endTime
		? entry.endTime instanceof Date
			? entry.endTime
			: new Date(entry.endTime)
		: new Date();
	const originalStartDate =
		entry.startTime instanceof Date
			? entry.startTime
			: new Date(entry.startTime);
	const originalDurationMs =
		originalEndDate.getTime() - originalStartDate.getTime();

	// Calculate new duration
	const newDurationMs = endTime.getTime() - startTime.getTime();
	const durationChangeMs = newDurationMs - originalDurationMs;

	// Format duration change
	let changeText = "";
	let changeColor = "#64748b";
	if (durationChangeMs !== 0) {
		const sign = durationChangeMs > 0 ? "+" : "-";
		changeText = ` (${sign}${formatDuration(Math.abs(durationChangeMs))})`;
		changeColor = durationChangeMs > 0 ? "#10b981" : "#ef4444";
	}

	// Calculate amount if hourly rate exists
	let amountPreview = "";
	if (entry.project.hourlyRate && newDurationMs > 0) {
		const amount = (newDurationMs / 3600000) * entry.project.hourlyRate;
		amountPreview = `$${amount.toFixed(2)}`;
	}

	return (
		<Modal title="Edit Time Entry" height={23}>
			<box style={{ flexDirection: "row", marginTop: 1, gap: 2 }}>
				<text>
					<span fg={entry.project.color}>{entry.project.name}</span>
				</text>
				<text>
					<span fg={newDurationMs > 0 ? "#ffffff" : "#ef4444"}>
						{newDurationMs > 0 ? formatDuration(newDurationMs) : "0m"}
					</span>
					<span fg={changeColor}>{changeText}</span>
					{amountPreview && <span fg="#10b981"> ({amountPreview})</span>}
				</text>
			</box>

			{error && (
				<box style={{ marginTop: 1 }}>
					<text fg="#ef4444">{error}</text>
				</box>
			)}

			<box
				onClick={() => setActiveSection("start")}
				style={{
					flexDirection: "row",
					marginTop: 1,
					alignItems: "center",
					gap: 2,
				}}
			>
				<box style={{ width: 11 }}>
					<text fg={activeSection === "start" ? "#ffffff" : "#94a3b8"}>
						Start Time
					</text>
				</box>
				<box>{startPicker.render}</box>
			</box>

			<box
				onClick={() => setActiveSection("end")}
				style={{
					flexDirection: "row",
					marginTop: 1,
					alignItems: "center",
					gap: 2,
				}}
			>
				<box style={{ width: 11 }}>
					<text fg={activeSection === "end" ? "#ffffff" : "#94a3b8"}>
						End Time
					</text>
				</box>
				<box>{endPicker.render}</box>
			</box>

			<box
				onClick={() => setActiveSection("description")}
				style={{ flexDirection: "column", marginTop: 1 }}
			>
				<box style={{ width: "100%" }}>
					<text fg="#fff">Description</text>
				</box>
				<box
					style={{
						border: true,
						borderColor:
							activeSection === "description"
								? COLORS.border
								: COLORS.borderOff,
						width: "100%",
						height: 3,
					}}
				>
					<input
						ref={descriptionInputRef}
						placeholder="What did you work on?"
						focused={activeSection === "description"}
						onInput={setDescription}
						onSubmit={handleSubmit}
						value={description}
					/>
				</box>
			</box>

			<box style={{ marginTop: 1 }}>
				<text fg="#64748b">Tab: next field | Enter: save | Esc: cancel</text>
			</box>
		</Modal>
	);
}
