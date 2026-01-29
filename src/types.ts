import type {
	Project,
	Task,
	Tag,
	TimeEntry,
	Customer,
	Invoice,
} from "../generated/prisma/client.ts";

export type { Project, Task, Tag, TimeEntry, Customer, Invoice };

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface ProjectWithTasks extends Project {
	tasks: Task[];
}

export interface ProjectWithTaskCounts extends Project {
	tasks: { id: string; status: string }[];
}

export interface TaskWithTags extends Task {
	tags: { tag: Tag }[];
}

export interface TaskWithProject extends Task {
	project: Project;
	tags: { tag: Tag }[];
}

export type View =
	| "dashboard"
	| "projects"
	| "tasks"
	| "settings"
	| "help"
	| "timesheets"
	| "invoices";

export type Panel = "projects" | "tasks" | "details";

export interface AppState {
	currentView: View;
	activePanel: Panel;
	selectedProjectId: string | null;
	selectedTaskId: string | null;
	showArchived: boolean;
	inputMode: InputMode | null;
}

export type InputMode =
	| "create_project"
	| "edit_project"
	| "create_task"
	| "edit_task"
	| "edit_dashboard_task"
	| "confirm_delete"
	| "stop_timer"
	| "select_timer_project"
	| "search"
	| "edit_business_name"
	| "edit_stripe_key"
	| "edit_timezone"
	| "select_theme"
	| "confirm_import"
	| "edit_time_entry"
	| "create_invoice"
	| "confirm_delete_time_entry"
	| "create_customer"
	| "edit_customer"
	| "select_customer";

export interface RunningTimer {
	id: string;
	startTime: Date;
	project: {
		id: string;
		name: string;
		color: string;
		hourlyRate: number | null;
	};
}

export interface TimeEntryWithProject extends TimeEntry {
	project: {
		id: string;
		name: string;
		color: string;
		hourlyRate: number | null;
	};
}

export interface TimeStats {
	todayMs: number;
	weekMs: number;
	monthMs: number;
}

export interface AppSettings {
	businessName: string;
	stripeApiKey: string;
	timezone: string; // IANA timezone (e.g., "America/New_York") or "auto" for system detection
	theme: string; // Theme name (e.g., "catppuccin-mocha", "neon")
}

// Theme color definitions
export interface Theme {
	name: string;
	displayName: string;
	colors: {
		// Base colors
		bg: string;
		surface: string;
		overlay: string;
		// Border colors
		border: string;
		borderOff: string;
		borderSubtle: string;
		// Text colors
		textPrimary: string;
		textSecondary: string;
		textMuted: string;
		// Accent colors
		accent: string;
		accentSecondary: string;
		// Selection
		selectedRowBg: string;
		selectedText: string;
		// Status colors
		success: string;
		warning: string;
		error: string;
		info: string;
		// Task status colors
		statusTodo: string;
		statusInProgress: string;
		statusDone: string;
		// Priority colors
		priorityLow: string;
		priorityMedium: string;
		priorityHigh: string;
		priorityUrgent: string;
	};
	// Project color palette
	projectColors: string[];
}

// Catppuccin Mocha theme
export const CATPPUCCIN_MOCHA: Theme = {
	name: "catppuccin-mocha",
	displayName: "Catppuccin Mocha",
	colors: {
		bg: "#1e1e2e", // base
		surface: "#313244", // surface0
		overlay: "#45475a", // surface1
		border: "#cba6f7", // mauve
		borderOff: "#585b70", // surface2
		borderSubtle: "#45475a", // surface1
		textPrimary: "#cdd6f4", // text
		textSecondary: "#bac2de", // subtext1
		textMuted: "#6c7086", // overlay1
		accent: "#89b4fa", // blue
		accentSecondary: "#f5c2e7", // pink
		selectedRowBg: "#45475a", // surface1
		selectedText: "#cdd6f4", // text
		success: "#a6e3a1", // green
		warning: "#f9e2af", // yellow
		error: "#f38ba8", // red
		info: "#89dceb", // sky
		statusTodo: "#89b4fa", // blue
		statusInProgress: "#f9e2af", // yellow
		statusDone: "#a6e3a1", // green
		priorityLow: "#6c7086", // overlay1
		priorityMedium: "#89b4fa", // blue
		priorityHigh: "#f9e2af", // yellow
		priorityUrgent: "#f38ba8", // red
	},
	projectColors: [
		"#cba6f7", // mauve
		"#89b4fa", // blue
		"#a6e3a1", // green
		"#fab387", // peach
		"#f5c2e7", // pink
		"#f9e2af", // yellow
		"#94e2d5", // teal
		"#f38ba8", // red
	],
};

// Neon theme (original)
export const NEON_THEME: Theme = {
	name: "neon",
	displayName: "Neon",
	colors: {
		bg: "#0d0221",
		surface: "#1a0533",
		overlay: "#2d0a4e",
		border: "#ff00ff",
		borderOff: "#6b21a8",
		borderSubtle: "#3b0764",
		textPrimary: "#e0f2fe",
		textSecondary: "#c084fc",
		textMuted: "#581c87",
		accent: "#00ffff",
		accentSecondary: "#ff00ff",
		selectedRowBg: "#7c3aed",
		selectedText: "#ffffff",
		success: "#39ff14",
		warning: "#ffff00",
		error: "#ff0055",
		info: "#00ffff",
		statusTodo: "#00ffff", // cyan
		statusInProgress: "#ffff00", // yellow
		statusDone: "#39ff14", // green
		priorityLow: "#6b21a8",
		priorityMedium: "#00ffff",
		priorityHigh: "#ffff00",
		priorityUrgent: "#ff0055",
	},
	projectColors: [
		"#ff00ff", // Neon magenta
		"#00ffff", // Neon cyan
		"#39ff14", // Neon green
		"#ff6600", // Neon orange
		"#ff1493", // Neon pink
		"#ffff00", // Neon yellow
		"#00ff88", // Neon mint
		"#ff3366", // Neon rose
	],
};

// Light theme
export const LIGHT_THEME: Theme = {
	name: "light",
	displayName: "Light",
	colors: {
		bg: "#ffffff",
		surface: "#f5f5f5",
		overlay: "#e8e8e8",
		border: "#0066cc",
		borderOff: "#cccccc",
		borderSubtle: "#e0e0e0",
		textPrimary: "#1a1a1a",
		textSecondary: "#4a4a4a",
		textMuted: "#888888",
		accent: "#0066cc",
		accentSecondary: "#6633cc",
		selectedRowBg: "#cce5ff",
		selectedText: "#1a1a1a",
		success: "#28a745",
		warning: "#d69e2e",
		error: "#dc3545",
		info: "#17a2b8",
		statusTodo: "#0066cc", // blue
		statusInProgress: "#d69e2e", // yellow/orange
		statusDone: "#28a745", // green
		priorityLow: "#888888",
		priorityMedium: "#0066cc",
		priorityHigh: "#d69e2e",
		priorityUrgent: "#dc3545",
	},
	projectColors: [
		"#0066cc", // Blue
		"#28a745", // Green
		"#6633cc", // Purple
		"#e67700", // Orange
		"#dc3545", // Red
		"#d69e2e", // Yellow/Gold
		"#17a2b8", // Teal
		"#e83e8c", // Pink
	],
};

// Dracula theme
export const DRACULA_THEME: Theme = {
	name: "dracula",
	displayName: "Dracula",
	colors: {
		bg: "#282a36", // Background
		surface: "#343746", // Current Line
		overlay: "#44475a", // Selection
		border: "#bd93f9", // Purple
		borderOff: "#6272a4", // Comment
		borderSubtle: "#44475a", // Selection
		textPrimary: "#f8f8f2", // Foreground
		textSecondary: "#f8f8f2", // Foreground
		textMuted: "#6272a4", // Comment
		accent: "#8be9fd", // Cyan
		accentSecondary: "#ff79c6", // Pink
		selectedRowBg: "#44475a", // Selection
		selectedText: "#f8f8f2", // Foreground
		success: "#50fa7b", // Green
		warning: "#f1fa8c", // Yellow
		error: "#ff5555", // Red
		info: "#8be9fd", // Cyan
		statusTodo: "#bd93f9", // Purple
		statusInProgress: "#f1fa8c", // Yellow
		statusDone: "#50fa7b", // Green
		priorityLow: "#6272a4", // Comment
		priorityMedium: "#8be9fd", // Cyan
		priorityHigh: "#f1fa8c", // Yellow
		priorityUrgent: "#ff5555", // Red
	},
	projectColors: [
		"#bd93f9", // Purple
		"#8be9fd", // Cyan
		"#50fa7b", // Green
		"#ffb86c", // Orange
		"#ff79c6", // Pink
		"#f1fa8c", // Yellow
		"#ff5555", // Red
		"#6272a4", // Comment (muted blue)
	],
};

// Monokai theme
export const MONOKAI_THEME: Theme = {
	name: "monokai",
	displayName: "Monokai",
	colors: {
		bg: "#272822", // Background
		surface: "#3e3d32", // Line highlight
		overlay: "#49483e", // Selection
		border: "#a6e22e", // Green
		borderOff: "#75715e", // Comment
		borderSubtle: "#49483e", // Selection
		textPrimary: "#f8f8f2", // Foreground
		textSecondary: "#f8f8f0", // Foreground light
		textMuted: "#75715e", // Comment
		accent: "#66d9ef", // Cyan
		accentSecondary: "#ae81ff", // Purple
		selectedRowBg: "#49483e", // Selection
		selectedText: "#f8f8f2", // Foreground
		success: "#a6e22e", // Green
		warning: "#e6db74", // Yellow
		error: "#f92672", // Pink/Red
		info: "#66d9ef", // Cyan
		statusTodo: "#ae81ff", // Purple
		statusInProgress: "#e6db74", // Yellow
		statusDone: "#a6e22e", // Green
		priorityLow: "#75715e", // Comment
		priorityMedium: "#66d9ef", // Cyan
		priorityHigh: "#e6db74", // Yellow
		priorityUrgent: "#f92672", // Pink/Red
	},
	projectColors: [
		"#a6e22e", // Green
		"#66d9ef", // Cyan
		"#f92672", // Pink/Red
		"#fd971f", // Orange
		"#ae81ff", // Purple
		"#e6db74", // Yellow
		"#f8f8f2", // White
		"#75715e", // Comment (gray)
	],
};

// All available themes
export const THEMES: Record<string, Theme> = {
	"catppuccin-mocha": CATPPUCCIN_MOCHA,
	dracula: DRACULA_THEME,
	monokai: MONOKAI_THEME,
	neon: NEON_THEME,
	light: LIGHT_THEME,
};

// Get theme by name (defaults to catppuccin-mocha)
export function getTheme(name: string): Theme {
	return THEMES[name] ?? CATPPUCCIN_MOCHA;
}

// Get list of theme names for settings
export function getThemeNames(): string[] {
	return Object.keys(THEMES);
}

// Get theme display names
export function getThemeDisplayNames(): { name: string; displayName: string }[] {
	return Object.values(THEMES).map((t) => ({
		name: t.name,
		displayName: t.displayName,
	}));
}

// Get the system's detected timezone
export function getSystemTimezone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Get the effective timezone (resolves "auto" to system timezone)
export function getEffectiveTimezone(settings: AppSettings): string {
	if (!settings.timezone || settings.timezone === "auto") {
		return getSystemTimezone();
	}
	return settings.timezone;
}

// Format a date for display in the given timezone
export function formatDateInTimezone(
	date: Date | string,
	timezone: string,
): string {
	if (!date) return "";
	const dateObj = date instanceof Date ? date : new Date(date);
	if (isNaN(dateObj.getTime())) return "";

	try {
		return dateObj.toLocaleDateString("en-US", {
			timeZone: timezone,
			month: "short",
			day: "numeric",
		});
	} catch {
		return dateObj.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	}
}

// Format a time for display in the given timezone
export function formatTimeInTimezone(
	date: Date | string,
	timezone: string,
): string {
	if (!date) return "";
	const dateObj = date instanceof Date ? date : new Date(date);
	if (isNaN(dateObj.getTime())) return "";

	try {
		return dateObj.toLocaleTimeString("en-US", {
			timeZone: timezone,
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	} catch {
		return dateObj.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	}
}

// Format a date-time for editing (YYYY-MM-DD HH:MM) in the given timezone
export function formatDateTimeForEdit(
	date: Date | string,
	timezone: string,
): string {
	if (!date) return "";

	const dateObj = date instanceof Date ? date : new Date(date);
	if (isNaN(dateObj.getTime())) return "";

	try {
		const formatter = new Intl.DateTimeFormat("en-CA", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
		const parts = formatter.formatToParts(dateObj);
		const get = (type: string) =>
			parts.find((p) => p.type === type)?.value || "";
		return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
	} catch {
		// Fallback to local time if timezone is invalid
		const year = dateObj.getFullYear();
		const month = String(dateObj.getMonth() + 1).padStart(2, "0");
		const day = String(dateObj.getDate()).padStart(2, "0");
		const hours = String(dateObj.getHours()).padStart(2, "0");
		const minutes = String(dateObj.getMinutes()).padStart(2, "0");
		return `${year}-${month}-${day} ${hours}:${minutes}`;
	}
}

// Parse a date-time string (YYYY-MM-DD HH:MM) in the given timezone
export function parseDateTimeInTimezone(
	input: string,
	timezone: string,
): Date | null {
	const match = input.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
	if (!match || !match[1] || !match[2] || !match[3] || !match[4] || !match[5]) {
		return null;
	}

	const [, year, month, day, hour, minute] = match;
	const dateStr = `${year}-${month}-${day}T${hour.padStart(2, "0")}:${minute}:00`;

	try {
		// Use Intl to get the offset for this date in the target timezone
		const testDate = new Date(dateStr + "Z"); // Parse as UTC first
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: timezone,
			timeZoneName: "shortOffset",
		});

		// Get parts to find the offset
		const parts = formatter.formatToParts(testDate);
		const offsetPart =
			parts.find((p) => p.type === "timeZoneName")?.value || "";

		// Parse offset like "GMT-5" or "GMT+5:30"
		const offsetMatch = offsetPart.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
		let offsetMinutes = 0;
		if (offsetMatch) {
			const sign = offsetMatch[1] === "-" ? -1 : 1;
			const hours = parseInt(offsetMatch[2] || "0", 10);
			const minutes = parseInt(offsetMatch[3] || "0", 10);
			offsetMinutes = sign * (hours * 60 + minutes);
		}

		// Create the date by adjusting for the timezone offset
		const utcDate = new Date(dateStr + "Z");
		utcDate.setMinutes(utcDate.getMinutes() - offsetMinutes);

		if (isNaN(utcDate.getTime())) {
			return null;
		}
		return utcDate;
	} catch {
		// Fallback: parse as local time if timezone is invalid
		const localDate = new Date(
			parseInt(year),
			parseInt(month) - 1,
			parseInt(day),
			parseInt(hour),
			parseInt(minute),
		);
		if (isNaN(localDate.getTime())) {
			return null;
		}
		return localDate;
	}
}

export interface DashboardStats {
	totalProjects: number;
	activeProjects: number;
	archivedProjects: number;
	totalTasks: number;
	todoTasks: number;
	inProgressTasks: number;
	doneTasks: number;
	overdueTasks: number;
	completionRate: number;
}

export interface WeeklyTimeData {
	weekStart: string;
	weekLabel: string;
	projects: {
		projectId: string;
		projectName: string;
		projectColor: string;
		ms: number;
	}[];
	totalMs: number;
}

export interface TimesheetGroup {
	project: {
		id: string;
		name: string;
		color: string;
		hourlyRate: number | null;
		customer: Customer | null;
	};
	entries: TimeEntryWithProject[];
	totalMs: number;
	totalAmount: number;
}

export interface AllTimersWeekData {
	weekStart: Date;
	weekEnd: Date;
	entries: TimeEntryWithProject[];
	totalMs: number;
}

export interface ProjectWithCustomer extends Project {
	customer: Customer | null;
}

export interface TimeEntryWithInvoice extends TimeEntry {
	invoiceId: string | null;
	project: {
		id: string;
		name: string;
		color: string;
		hourlyRate: number | null;
		customer: Customer | null;
	};
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
	todo: "To Do",
	in_progress: "In Progress",
	done: "Done",
};

export const STATUS_ICONS: Record<TaskStatus, string> = {
	todo: "○",
	in_progress: "◐",
	done: "●",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
	low: "Low",
	medium: "Medium",
	high: "High",
	urgent: "Urgent",
};

// Get priority colors from theme
export function getPriorityColors(theme: Theme): Record<TaskPriority, string> {
	return {
		low: theme.colors.priorityLow,
		medium: theme.colors.priorityMedium,
		high: theme.colors.priorityHigh,
		urgent: theme.colors.priorityUrgent,
	};
}

// Legacy static exports (for backwards compatibility, uses catppuccin-mocha)
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
	low: CATPPUCCIN_MOCHA.colors.priorityLow,
	medium: CATPPUCCIN_MOCHA.colors.priorityMedium,
	high: CATPPUCCIN_MOCHA.colors.priorityHigh,
	urgent: CATPPUCCIN_MOCHA.colors.priorityUrgent,
};

export const PROJECT_COLORS = CATPPUCCIN_MOCHA.projectColors;

export const COLORS = {
	bg: CATPPUCCIN_MOCHA.colors.bg,
	border: CATPPUCCIN_MOCHA.colors.border,
	borderOff: CATPPUCCIN_MOCHA.colors.borderOff,
	selectedRowBg: CATPPUCCIN_MOCHA.colors.selectedRowBg,
	textPrimary: CATPPUCCIN_MOCHA.colors.textPrimary,
	textSecondary: CATPPUCCIN_MOCHA.colors.textSecondary,
	accent: CATPPUCCIN_MOCHA.colors.accent,
};

// Stripe invoice data for display
export interface StripeInvoiceDisplay {
	id: string;
	number: string | null;
	customerName: string | null;
	customerEmail: string | null;
	status: string;
	amount: number;
	currency: string;
	created: Date;
	dueDate: Date | null;
	hostedUrl: string | null;
	pdfUrl: string | null;
}
