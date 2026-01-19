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

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
	low: "gray",
	medium: "blue",
	high: "yellow",
	urgent: "red",
};

export const PROJECT_COLORS = [
	"#3b82f6", // Blue
	"#10b981", // Green
	"#f59e0b", // Amber
	"#ef4444", // Red
	"#8b5cf6", // Purple
	"#ec4899", // Pink
	"#06b6d4", // Cyan
	"#f97316", // Orange
];

export const COLORS = {
	bg: "#171623",
	border: "#777777",
	borderOff: "#444444",
	selectedRowBg: "#3325b4",
	textPrimary: "#e0e0e0",
	textSecondary: "#94a3b8",
	accent: "#3b82f6",
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
