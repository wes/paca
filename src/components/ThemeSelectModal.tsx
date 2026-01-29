import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { getTheme, getThemeDisplayNames, type Theme } from "../types.ts";
import Modal from "./Modal.tsx";

interface ThemeSelectModalProps {
	currentTheme: string;
	onSelect: (themeName: string) => void;
	onCancel: () => void;
}

export function ThemeSelectModal({
	currentTheme,
	onSelect,
	onCancel,
}: ThemeSelectModalProps) {
	const themes = getThemeDisplayNames();
	const currentIndex = themes.findIndex((t) => t.name === currentTheme);
	const [selectedIndex, setSelectedIndex] = useState(
		currentIndex >= 0 ? currentIndex : 0,
	);

	const theme = getTheme(currentTheme);
	const colors = theme.colors;

	useKeyboard((key) => {
		if (key.name === "escape") {
			onCancel();
			return;
		}
		if (key.name === "return") {
			const selected = themes[selectedIndex];
			if (selected) {
				onSelect(selected.name);
			}
			return;
		}
		if (key.name === "down" || key.name === "j") {
			setSelectedIndex((i) => Math.min(i + 1, themes.length - 1));
			return;
		}
		if (key.name === "up" || key.name === "k") {
			setSelectedIndex((i) => Math.max(i - 1, 0));
			return;
		}
	});

	return (
		<Modal title="Select Theme" height={14} theme={theme}>
			<box style={{ flexGrow: 1, marginTop: 1 }}>
				{themes.map((t, index) => {
					const isSelected = index === selectedIndex;
					const isCurrent = t.name === currentTheme;
					const previewTheme = getTheme(t.name);

					return (
						<box
							key={t.name}
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
									{t.displayName}
								</span>
								{isCurrent && (
									<span fg={colors.success}> (current)</span>
								)}
								<span fg={colors.textMuted}>  </span>
								{/* Color preview */}
								<span fg={previewTheme.colors.accent}>●</span>
								<span fg={previewTheme.colors.success}>●</span>
								<span fg={previewTheme.colors.warning}>●</span>
								<span fg={previewTheme.colors.error}>●</span>
							</text>
						</box>
					);
				})}
			</box>
			<text fg={colors.textMuted} style={{ marginTop: 1 }}>
				↑/↓ to navigate, Enter to select, Esc to cancel
			</text>
		</Modal>
	);
}
