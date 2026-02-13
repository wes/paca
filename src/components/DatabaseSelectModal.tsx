import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { Theme } from "../types.ts";
import Modal from "./Modal.tsx";

interface DatabaseSelectModalProps {
	databases: string[];
	currentDatabase: string;
	onSelect: (filename: string) => void;
	onCreateNew: () => void;
	onCancel: () => void;
	theme: Theme;
}

export function DatabaseSelectModal({
	databases,
	currentDatabase,
	onSelect,
	onCreateNew,
	onCancel,
	theme,
}: DatabaseSelectModalProps) {
	const currentIndex = databases.indexOf(currentDatabase);
	const [selectedIndex, setSelectedIndex] = useState(
		currentIndex >= 0 ? currentIndex : 0,
	);

	const colors = theme.colors;

	// Total items = databases + "Create new" option
	const totalItems = databases.length + 1;

	useKeyboard((key) => {
		if (key.name === "escape") {
			onCancel();
			return;
		}
		if (key.name === "return") {
			if (selectedIndex === databases.length) {
				onCreateNew();
			} else {
				const selected = databases[selectedIndex];
				if (selected) {
					onSelect(selected);
				}
			}
			return;
		}
		if (key.name === "down" || key.name === "j") {
			setSelectedIndex((i) => Math.min(i + 1, totalItems - 1));
			return;
		}
		if (key.name === "up" || key.name === "k") {
			setSelectedIndex((i) => Math.max(i - 1, 0));
			return;
		}
	});

	// border(2) + padding(2) + title(1) + marginTop(1) + items + spacer(1) + create_new(1) + marginTop(1) + help(1)
	const height = Math.min(totalItems + 10, 20);

	return (
		<Modal title="Select Database" height={height} theme={theme}>
			<box style={{ flexGrow: 1, marginTop: 1 }}>
				{databases.map((db, index) => {
					const isSelected = index === selectedIndex;
					const isCurrent = db === currentDatabase;
					const displayName = db.replace(/\.db$/, "");

					return (
						<box
							key={db}
							style={{
								paddingLeft: 1,
								paddingRight: 1,
								backgroundColor: isSelected ? colors.selectedRowBg : "transparent",
							}}
						>
							<text>
								<span fg={isSelected ? colors.selectedText : colors.textPrimary}>
									{isSelected ? "▸ " : "  "}
								</span>
								<span
									fg={isSelected ? colors.selectedText : colors.textPrimary}
									attributes={isSelected ? "bold" : undefined}
								>
									{displayName}
								</span>
								{isCurrent && (
									<span fg={colors.success}> (active)</span>
								)}
							</text>
						</box>
					);
				})}

				{/* Create new option */}
				<box
					style={{
						paddingLeft: 1,
						paddingRight: 1,
						marginTop: databases.length > 0 ? 1 : 0,
						backgroundColor: selectedIndex === databases.length ? colors.selectedRowBg : "transparent",
					}}
				>
					<text>
						<span fg={selectedIndex === databases.length ? colors.selectedText : colors.accent}>
							{selectedIndex === databases.length ? "▸ " : "  "}
						</span>
						<span
							fg={selectedIndex === databases.length ? colors.selectedText : colors.accent}
							attributes={selectedIndex === databases.length ? "bold" : undefined}
						>
							+ Create new database...
						</span>
					</text>
				</box>
			</box>
			<text fg={colors.textMuted} style={{ marginTop: 1 }}>
				↑/↓ to navigate, Enter to select, Esc to cancel
			</text>
		</Modal>
	);
}
