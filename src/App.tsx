import { useState, useEffect, useCallback } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import {
	Header,
	StatusBar,
	ProjectList,
	TaskList,
	Dashboard,
	HelpView,
	SettingsView,
	SETTINGS_COUNT,
	InputModal,
	ConfirmModal,
	ProjectModal,
	ProjectSelectModal,
	StopTimerModal,
	SplashScreen,
	TimesheetView,
	CustomerModal,
	CustomerSelectModal,
	EditTimeEntryModal,
	CreateInvoiceModal,
} from "./components/index.ts";
import { InvoicesView } from "./components/InvoicesView.tsx";
import {
	projects,
	tasks,
	stats,
	timeEntries,
	settings,
	database,
	customers,
	invoices,
} from "./db.ts";
import { getOrCreateStripeCustomer, createDraftInvoice, listInvoices, type StripeInvoiceItem } from "./stripe.ts";
import {
	getEffectiveTimezone,
	type View,
	type Panel,
	type InputMode,
	type ProjectWithTaskCounts,
	type Task,
	type DashboardStats,
	type RunningTimer,
	type AppSettings,
	type TimesheetGroup,
	type Customer,
	type TimeEntry,
	type TimeEntryWithProject,
} from "./types.ts";

function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function App() {
	const renderer = useRenderer();

	// Splash Screen State
	const [showSplash, setShowSplash] = useState(true);

	// View & Navigation State
	const [currentView, setCurrentView] = useState<View>("dashboard");
	const [activePanel, setActivePanel] = useState<Panel>("projects");
	const [showArchived, setShowArchived] = useState(false);

	// Data State
	const [projectList, setProjectList] = useState<ProjectWithTaskCounts[]>([]);
	const [taskList, setTaskList] = useState<Task[]>([]);
	const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
		totalProjects: 0,
		activeProjects: 0,
		archivedProjects: 0,
		totalTasks: 0,
		todoTasks: 0,
		inProgressTasks: 0,
		doneTasks: 0,
		overdueTasks: 0,
		completionRate: 0,
	});
	const [recentTasks, setRecentTasks] = useState<
		(Task & { project: { name: string; color: string } })[]
	>([]);

	// Timer State
	const [runningTimer, setRunningTimer] = useState<RunningTimer | null>(null);
	const [timerElapsed, setTimerElapsed] = useState(0);

	// Selection State
	const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);
	const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
	const [selectedSettingsIndex, setSelectedSettingsIndex] = useState(0);
	const [selectedDashboardTaskIndex, setSelectedDashboardTaskIndex] =
		useState(0);

	// Settings State
	const [appSettings, setAppSettings] = useState<AppSettings>({
		businessName: "",
		stripeApiKey: "",
		timezone: "auto",
	});

	// Timesheet State
	const [timesheetGroups, setTimesheetGroups] = useState<TimesheetGroup[]>([]);
	const [selectedTimesheetGroupIndex, setSelectedTimesheetGroupIndex] =
		useState(0);
	const [selectedTimeEntryIndex, setSelectedTimeEntryIndex] = useState(0);
	const [selectedTimeEntryIds, setSelectedTimeEntryIds] = useState<Set<string>>(
		new Set(),
	);
	const [editingTimeEntry, setEditingTimeEntry] = useState<
		| (TimeEntry & {
				project: {
					id: string;
					name: string;
					color: string;
					hourlyRate: number | null;
				};
		  })
		| null
	>(null);

	// Customer State
	const [customerList, setCustomerList] = useState<Customer[]>([]);
	const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

	// Invoices State
	const [stripeInvoices, setStripeInvoices] = useState<StripeInvoiceItem[]>([]);
	const [selectedInvoiceIndex, setSelectedInvoiceIndex] = useState(0);
	const [invoicesLoading, setInvoicesLoading] = useState(false);
	const [invoicesError, setInvoicesError] = useState<string | null>(null);
	const [invoicesPage, setInvoicesPage] = useState(1);
	const [invoicesHasMore, setInvoicesHasMore] = useState(false);
	const [invoicesCursors, setInvoicesCursors] = useState<string[]>([]); // Stack of cursors for pagination

	// Modal State
	const [inputMode, setInputMode] = useState<InputMode | null>(null);
	const [statusMessage, setStatusMessage] =
		useState<string>("Welcome to Paca!");
	const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
	const [confirmMessage, setConfirmMessage] = useState("");

	// Load data
	const loadProjects = useCallback(async () => {
		const data = await projects.getAll(showArchived);
		setProjectList(data);
		if (selectedProjectIndex >= data.length) {
			setSelectedProjectIndex(Math.max(0, data.length - 1));
		}
	}, [showArchived, selectedProjectIndex]);

	const loadTasks = useCallback(async () => {
		const selectedProject = projectList[selectedProjectIndex];
		if (selectedProject) {
			const data = await tasks.getByProject(selectedProject.id);
			setTaskList(data);
			if (selectedTaskIndex >= data.length) {
				setSelectedTaskIndex(Math.max(0, data.length - 1));
			}
		} else {
			setTaskList([]);
		}
	}, [projectList, selectedProjectIndex, selectedTaskIndex]);

	const loadDashboard = useCallback(async () => {
		const [statsData, recent] = await Promise.all([
			stats.getDashboardStats(),
			stats.getRecentActivity(10),
		]);
		setDashboardStats(statsData);
		setRecentTasks(
			recent as (Task & { project: { name: string; color: string } })[],
		);
	}, []);

	const loadRunningTimer = useCallback(async () => {
		const running = await timeEntries.getRunning();
		if (running) {
			setRunningTimer({
				id: running.id,
				startTime: running.startTime,
				project: running.project,
			});
		} else {
			setRunningTimer(null);
		}
	}, []);

	const loadSettings = useCallback(async () => {
		const data = await settings.getAppSettings();
		setAppSettings(data);
	}, []);

	const loadCustomers = useCallback(async () => {
		const data = await customers.getAll();
		setCustomerList(data);
	}, []);

	const loadStripeInvoices = useCallback(async (cursor?: string, isNextPage = false) => {
		if (!appSettings.stripeApiKey) {
			setStripeInvoices([]);
			setInvoicesError(null);
			return;
		}

		setInvoicesLoading(true);
		setInvoicesError(null);

		try {
			const result = await listInvoices(appSettings.stripeApiKey, 25, cursor);
			setStripeInvoices(result.invoices);
			setInvoicesHasMore(result.hasMore);
			setSelectedInvoiceIndex(0);

			// Track cursor for pagination
			if (isNextPage && cursor) {
				setInvoicesCursors(prev => [...prev, cursor]);
			}
		} catch (error) {
			setInvoicesError(error instanceof Error ? error.message : "Failed to load invoices");
			setStripeInvoices([]);
		} finally {
			setInvoicesLoading(false);
		}
	}, [appSettings.stripeApiKey]);

	const loadTimesheets = useCallback(async () => {
		const entries = await timeEntries.getUninvoiced();

		// Group entries by project (only include projects with hourly rate > 0)
		const groupMap = new Map<string, TimesheetGroup>();

		for (const entry of entries) {
			// Skip entries for projects without an hourly rate
			if (!entry.project.hourlyRate || entry.project.hourlyRate <= 0) {
				continue;
			}

			const projectId = entry.project.id;
			let group = groupMap.get(projectId);

			if (!group) {
				group = {
					project: entry.project as TimesheetGroup["project"],
					entries: [],
					totalMs: 0,
					totalAmount: 0,
				};
				groupMap.set(projectId, group);
			}

			group.entries.push(entry as TimeEntryWithProject);

			if (entry.endTime) {
				const duration =
					new Date(entry.endTime).getTime() -
					new Date(entry.startTime).getTime();
				group.totalMs += duration;
				group.totalAmount += (duration / 3600000) * entry.project.hourlyRate;
			}
		}

		// Convert to array sorted by project name
		const groups = Array.from(groupMap.values()).sort((a, b) =>
			a.project.name.localeCompare(b.project.name),
		);

		setTimesheetGroups(groups);

		// Adjust selection if needed
		if (selectedTimesheetGroupIndex >= groups.length) {
			setSelectedTimesheetGroupIndex(Math.max(0, groups.length - 1));
		}
		if (groups[selectedTimesheetGroupIndex]) {
			const currentGroup = groups[selectedTimesheetGroupIndex];
			if (selectedTimeEntryIndex >= currentGroup.entries.length) {
				setSelectedTimeEntryIndex(Math.max(0, currentGroup.entries.length - 1));
			}
		}
	}, [selectedTimesheetGroupIndex, selectedTimeEntryIndex]);

	// Hide splash screen after 2 seconds
	useEffect(() => {
		const timer = setTimeout(() => setShowSplash(false), 1000);
		return () => clearTimeout(timer);
	}, []);

	// Initial load
	useEffect(() => {
		loadProjects();
		loadDashboard();
		loadRunningTimer();
		loadSettings();
		loadCustomers();
	}, []);

	// Reload tasks when project selection changes
	useEffect(() => {
		loadTasks();
	}, [selectedProjectIndex, projectList]);

	// Reload dashboard when on dashboard view
	useEffect(() => {
		if (currentView === "dashboard") {
			loadDashboard();
		}
	}, [currentView]);

	// Reload timesheets when on timesheets view
	useEffect(() => {
		if (currentView === "timesheets") {
			loadTimesheets();
		}
	}, [currentView]);

	// Load invoices when on invoices view
	useEffect(() => {
		if (currentView === "invoices") {
			// Reset pagination when entering the view
			setInvoicesPage(1);
			setInvoicesCursors([]);
			loadStripeInvoices();
		}
	}, [currentView, loadStripeInvoices]);

	// Timer elapsed update
	useEffect(() => {
		if (!runningTimer) {
			setTimerElapsed(0);
			return;
		}

		const updateElapsed = () => {
			const start = new Date(runningTimer.startTime).getTime();
			setTimerElapsed(Date.now() - start);
		};

		updateElapsed();
		const interval = setInterval(updateElapsed, 1000);

		return () => clearInterval(interval);
	}, [runningTimer]);

	// Show message temporarily
	const showMessage = (msg: string) => {
		setStatusMessage(msg);
		setTimeout(() => setStatusMessage("Ready"), 3000);
	};

	// Timer handlers
	const handleStartTimer = async (projectId: string) => {
		const entry = await timeEntries.start(projectId);
		setRunningTimer({
			id: entry.id,
			startTime: entry.startTime,
			project: entry.project,
		});
		setInputMode(null);
		showMessage(`Timer started for ${entry.project.name}`);
	};

	const handleStopTimer = async (description: string) => {
		if (!runningTimer) return;

		const entry = await timeEntries.stop(
			runningTimer.id,
			description || undefined,
		);
		const duration =
			new Date(entry.endTime!).getTime() - new Date(entry.startTime).getTime();

		setRunningTimer(null);
		setInputMode(null);
		showMessage(`Timer stopped: ${formatDuration(duration)}`);
		loadDashboard();

		// Refresh timesheets if currently viewing them
		if (currentView === "timesheets") {
			loadTimesheets();
		}
	};

	// Keyboard handling
	useKeyboard((key) => {
		// Handle confirm modal
		if (confirmAction) {
			if (key.name === "y") {
				confirmAction();
				setConfirmAction(null);
				setConfirmMessage("");
			} else if (key.name === "n" || key.name === "escape") {
				setConfirmAction(null);
				setConfirmMessage("");
			}
			return;
		}

		// Handle input mode escape (except select_timer_project which has its own handler)
		if (inputMode && inputMode !== "select_timer_project") {
			if (key.name === "escape") {
				setInputMode(null);
			}
			return;
		}

		// Handle select timer project modal
		if (inputMode === "select_timer_project") {
			// The modal has its own keyboard handler
			return;
		}

		// Global timer shortcuts
		if (key.name === "t") {
			if (runningTimer) {
				showMessage("Timer already running. Press 's' to stop.");
			} else if (projectList.length === 0) {
				showMessage("Create a project first to start a timer");
			} else {
				setInputMode("select_timer_project");
			}
			return;
		}

		if (key.name === "s" && runningTimer) {
			setInputMode("stop_timer");
			return;
		}

		// Global navigation
		if (key.name === "1") {
			setCurrentView("dashboard");
			return;
		}
		if (key.name === "2") {
			setCurrentView("tasks");
			setActivePanel("tasks");
			return;
		}
		if (key.name === "3") {
			setCurrentView("timesheets");
			return;
		}
		if (key.name === "4") {
			setCurrentView("invoices");
			return;
		}
		if (key.name === "5") {
			setCurrentView("settings");
			return;
		}
		if (key.name === "?" || key.name === "slash") {
			setCurrentView("help");
			return;
		}

		// Quit
		if (key.name === "q") {
			// Stop renderer first to restore terminal state
			renderer.stop();
			// Give renderer time to finish, then reset terminal and exit
			setTimeout(() => {
				try {
					require("child_process").spawnSync("reset", [], { stdio: "inherit" });
				} catch {}
				process.exit(0);
			}, 50);
			return;
		}

		// View-specific handling
		if (currentView === "dashboard") {
			handleDashboardKeyboard(key);
		}
		if (currentView === "projects" || currentView === "tasks") {
			handleProjectsTasksKeyboard(key);
		}
		if (currentView === "settings") {
			handleSettingsKeyboard(key);
		}
		if (currentView === "timesheets") {
			handleTimesheetKeyboard(key);
		}
		if (currentView === "invoices") {
			handleInvoicesKeyboard(key);
		}
	});

	const handleDashboardKeyboard = (key: { name: string }) => {
		const maxIndex = recentTasks.length - 1;

		// Navigation
		if (key.name === "j" || key.name === "down") {
			setSelectedDashboardTaskIndex((i) => Math.min(i + 1, maxIndex));
			return;
		}
		if (key.name === "k" || key.name === "up") {
			setSelectedDashboardTaskIndex((i) => Math.max(i - 1, 0));
			return;
		}

		// Edit task
		if (key.name === "e" && recentTasks[selectedDashboardTaskIndex]) {
			setInputMode("edit_dashboard_task");
			return;
		}

		// Toggle status
		if (key.name === "space" && recentTasks[selectedDashboardTaskIndex]) {
			const task = recentTasks[selectedDashboardTaskIndex];
			if (task) {
				tasks.toggleStatus(task.id).then(() => {
					loadDashboard();
				});
			}
			return;
		}

		// Cycle priority
		if (key.name === "p" && recentTasks[selectedDashboardTaskIndex]) {
			const task = recentTasks[selectedDashboardTaskIndex];
			if (task) {
				const priorities = ["low", "medium", "high", "urgent"];
				const currentIndex = priorities.indexOf(task.priority);
				const nextPriority = priorities[(currentIndex + 1) % priorities.length];
				tasks.update(task.id, { priority: nextPriority }).then(() => {
					showMessage(`Priority: ${nextPriority}`);
					loadDashboard();
				});
			}
			return;
		}

		// Delete task
		if (key.name === "d" && recentTasks[selectedDashboardTaskIndex]) {
			const task = recentTasks[selectedDashboardTaskIndex];
			if (task) {
				setConfirmMessage(`Delete task "${task.title}"?`);
				setConfirmAction(() => () => {
					tasks.delete(task.id).then(() => {
						showMessage(`Deleted: ${task.title}`);
						loadDashboard();
						loadProjects();
					});
				});
			}
			return;
		}
	};

	const handleProjectsTasksKeyboard = (key: { name: string }) => {
		// Tab or left/right arrows to switch panels
		if (key.name === "tab") {
			setActivePanel((p) => (p === "projects" ? "tasks" : "projects"));
			return;
		}
		if (key.name === "left" || key.name === "h") {
			setActivePanel("projects");
			return;
		}
		if (key.name === "right" || key.name === "l") {
			setActivePanel("tasks");
			return;
		}

		// Toggle archived
		if (key.name === "A") {
			setShowArchived((s) => !s);
			showMessage(
				showArchived ? "Hiding archived projects" : "Showing archived projects",
			);
			loadProjects();
			return;
		}

		if (activePanel === "projects") {
			handleProjectKeyboard(key);
		} else {
			handleTaskKeyboard(key);
		}
	};

	const handleProjectKeyboard = (key: { name: string }) => {
		const maxIndex = projectList.length - 1;

		// Navigation
		if (key.name === "j" || key.name === "down") {
			setSelectedProjectIndex((i) => Math.min(i + 1, maxIndex));
			return;
		}
		if (key.name === "k" || key.name === "up") {
			setSelectedProjectIndex((i) => Math.max(i - 1, 0));
			return;
		}

		// Create project
		if (key.name === "n") {
			setInputMode("create_project");
			return;
		}

		// Edit project
		if (key.name === "e" && projectList[selectedProjectIndex]) {
			setInputMode("edit_project");
			return;
		}

		// Archive/Unarchive project
		if (key.name === "a" && projectList[selectedProjectIndex]) {
			const project = projectList[selectedProjectIndex];
			if (project) {
				if (project.archived) {
					projects.unarchive(project.id).then(() => {
						showMessage(`Unarchived: ${project.name}`);
						loadProjects();
					});
				} else {
					projects.archive(project.id).then(() => {
						showMessage(`Archived: ${project.name}`);
						loadProjects();
					});
				}
			}
			return;
		}

		// Delete project
		if (key.name === "d" && projectList[selectedProjectIndex]) {
			const project = projectList[selectedProjectIndex];
			if (project) {
				setConfirmMessage(`Delete project "${project.name}"?`);
				setConfirmAction(() => () => {
					projects.delete(project.id).then(() => {
						showMessage(`Deleted: ${project.name}`);
						loadProjects();
						loadDashboard();
					});
				});
			}
			return;
		}

		// Select project (Enter) - switch to tasks
		if (key.name === "return" && projectList[selectedProjectIndex]) {
			setActivePanel("tasks");
			setSelectedTaskIndex(0);
			return;
		}

		// Link customer to project
		if (key.name === "c" && projectList[selectedProjectIndex]) {
			setInputMode("select_customer");
			return;
		}
	};

	const handleTaskKeyboard = (key: { name: string }) => {
		const maxIndex = taskList.length - 1;

		// Navigation
		if (key.name === "j" || key.name === "down") {
			setSelectedTaskIndex((i) => Math.min(i + 1, maxIndex));
			return;
		}
		if (key.name === "k" || key.name === "up") {
			setSelectedTaskIndex((i) => Math.max(i - 1, 0));
			return;
		}

		// Create task
		if (key.name === "n" && projectList[selectedProjectIndex]) {
			setInputMode("create_task");
			return;
		}

		// Edit task
		if (key.name === "e" && taskList[selectedTaskIndex]) {
			setInputMode("edit_task");
			return;
		}

		// Toggle status
		if (key.name === "space" && taskList[selectedTaskIndex]) {
			const task = taskList[selectedTaskIndex];
			if (task) {
				tasks.toggleStatus(task.id).then(() => {
					loadTasks();
					loadDashboard();
				});
			}
			return;
		}

		// Delete task
		if (key.name === "d" && taskList[selectedTaskIndex]) {
			const task = taskList[selectedTaskIndex];
			if (task) {
				setConfirmMessage(`Delete task "${task.title}"?`);
				setConfirmAction(() => () => {
					tasks.delete(task.id).then(() => {
						showMessage(`Deleted: ${task.title}`);
						loadTasks();
						loadDashboard();
					});
				});
			}
			return;
		}

		// Cycle priority
		if (key.name === "p" && taskList[selectedTaskIndex]) {
			const task = taskList[selectedTaskIndex];
			if (task) {
				const priorities = ["low", "medium", "high", "urgent"];
				const currentIndex = priorities.indexOf(task.priority);
				const nextPriority = priorities[(currentIndex + 1) % priorities.length];
				tasks.update(task.id, { priority: nextPriority }).then(() => {
					showMessage(`Priority: ${nextPriority}`);
					loadTasks();
				});
			}
			return;
		}
	};

	const handleSettingsKeyboard = (key: { name: string }) => {
		const maxIndex = SETTINGS_COUNT - 1;

		// Navigation
		if (key.name === "j" || key.name === "down") {
			setSelectedSettingsIndex((i) => Math.min(i + 1, maxIndex));
			return;
		}
		if (key.name === "k" || key.name === "up") {
			setSelectedSettingsIndex((i) => Math.max(i - 1, 0));
			return;
		}

		// Select/activate setting
		if (key.name === "return") {
			switch (selectedSettingsIndex) {
				case 0: // Business Name
					setInputMode("edit_business_name");
					break;
				case 1: // Stripe API Key
					setInputMode("edit_stripe_key");
					break;
				case 2: // Timezone
					setInputMode("edit_timezone");
					break;
				case 3: // Export Database
					handleExportDatabase();
					break;
				case 4: // Import Database
					setConfirmMessage("Import will replace all data. Continue?");
					setConfirmAction(() => () => handleImportDatabase());
					break;
			}
			return;
		}

		// Escape to go back
		if (key.name === "escape") {
			setCurrentView("dashboard");
			return;
		}
	};

	const handleTimesheetKeyboard = (key: { name: string }) => {
		const currentGroup = timesheetGroups[selectedTimesheetGroupIndex];
		if (!currentGroup) return;

		const maxGroupIndex = timesheetGroups.length - 1;
		const maxEntryIndex = currentGroup.entries.length - 1;

		// Navigation within entries
		if (key.name === "j" || key.name === "down") {
			if (selectedTimeEntryIndex < maxEntryIndex) {
				setSelectedTimeEntryIndex((i) => i + 1);
			} else if (selectedTimesheetGroupIndex < maxGroupIndex) {
				// Move to next group
				setSelectedTimesheetGroupIndex((i) => i + 1);
				setSelectedTimeEntryIndex(0);
			}
			return;
		}
		if (key.name === "k" || key.name === "up") {
			if (selectedTimeEntryIndex > 0) {
				setSelectedTimeEntryIndex((i) => i - 1);
			} else if (selectedTimesheetGroupIndex > 0) {
				// Move to previous group
				const prevGroup = timesheetGroups[selectedTimesheetGroupIndex - 1];
				if (prevGroup) {
					setSelectedTimesheetGroupIndex((i) => i - 1);
					setSelectedTimeEntryIndex(prevGroup.entries.length - 1);
				}
			}
			return;
		}

		// Toggle selection for invoicing
		if (key.name === "space") {
			const entry = currentGroup.entries[selectedTimeEntryIndex];
			if (entry) {
				setSelectedTimeEntryIds((prev) => {
					const next = new Set(prev);
					if (next.has(entry.id)) {
						next.delete(entry.id);
					} else {
						next.add(entry.id);
					}
					return next;
				});
			}
			return;
		}

		// Edit entry
		if (key.name === "e") {
			const entry = currentGroup.entries[selectedTimeEntryIndex];
			if (entry) {
				setEditingTimeEntry(entry as typeof editingTimeEntry);
				setInputMode("edit_time_entry");
			}
			return;
		}

		// Delete entry
		if (key.name === "d") {
			const entry = currentGroup.entries[selectedTimeEntryIndex];
			if (entry) {
				setConfirmMessage(
					`Delete time entry from ${currentGroup.project.name}?`,
				);
				setConfirmAction(() => () => {
					timeEntries.delete(entry.id).then(() => {
						showMessage("Time entry deleted");
						loadTimesheets();
					});
				});
			}
			return;
		}

		// Create invoice
		if (key.name === "i") {
			// Get selected entries from current group (or all in group if none selected)
			const selectedInGroup = currentGroup.entries.filter((e) =>
				selectedTimeEntryIds.has(e.id),
			);
			if (selectedInGroup.length > 0 || currentGroup.entries.length > 0) {
				setInputMode("create_invoice");
			}
			return;
		}
	};

	const handleInvoicesKeyboard = (key: { name: string }) => {
		const maxIndex = stripeInvoices.length - 1;

		// Navigation
		if (key.name === "j" || key.name === "down") {
			setSelectedInvoiceIndex((i) => Math.min(i + 1, maxIndex));
			return;
		}
		if (key.name === "k" || key.name === "up") {
			setSelectedInvoiceIndex((i) => Math.max(i - 1, 0));
			return;
		}

		// Open invoice in browser
		if (key.name === "return") {
			const invoice = stripeInvoices[selectedInvoiceIndex];
			if (invoice) {
				// Use hosted URL for finalized invoices, dashboard URL for drafts
				const url = invoice.hostedUrl || invoice.dashboardUrl;
				const { spawn } = require("child_process");
				const platform = process.platform;
				const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
				spawn(cmd, [url], { detached: true, stdio: "ignore" });
				showMessage(invoice.hostedUrl ? "Opening invoice..." : "Opening in Stripe dashboard...");
			}
			return;
		}

		// Refresh
		if (key.name === "r") {
			setInvoicesPage(1);
			setInvoicesCursors([]);
			loadStripeInvoices();
			showMessage("Refreshing invoices...");
			return;
		}

		// Next page
		if (key.name === "]" && invoicesHasMore) {
			const lastInvoice = stripeInvoices[stripeInvoices.length - 1];
			if (lastInvoice) {
				setInvoicesPage((p) => p + 1);
				loadStripeInvoices(lastInvoice.id, true);
			}
			return;
		}

		// Previous page
		if (key.name === "[" && invoicesCursors.length > 0) {
			const newCursors = [...invoicesCursors];
			newCursors.pop(); // Remove current cursor
			const prevCursor = newCursors.pop(); // Get previous cursor
			setInvoicesCursors(newCursors);
			setInvoicesPage((p) => Math.max(1, p - 1));
			loadStripeInvoices(prevCursor, false);
			return;
		}

		// Escape to go back
		if (key.name === "escape") {
			setCurrentView("dashboard");
			return;
		}
	};

	// Settings handlers
	const handleExportDatabase = async () => {
		const { existsSync, mkdirSync } = await import("fs");
		const backupDir = `${process.env.HOME}/.paca/backups`;

		// Ensure backups directory exists
		if (!existsSync(backupDir)) {
			mkdirSync(backupDir, { recursive: true });
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const exportPath = `${backupDir}/paca-backup-${timestamp}.db`;
		try {
			await database.exportToFile(exportPath);
			showMessage(`Exported to ${exportPath}`);
		} catch (error) {
			showMessage(`Export failed: ${error}`);
		}
	};

	const handleImportDatabase = async () => {
		// For now, show a message about how to import
		// In a full implementation, you'd use a file picker
		showMessage("Place backup file at ~/.paca/paca.db and restart");
	};

	const handleUpdateBusinessName = async (name: string) => {
		await settings.set("businessName", name);
		setAppSettings((prev) => ({ ...prev, businessName: name }));
		setInputMode(null);
		showMessage("Business name updated");
	};

	const handleUpdateStripeKey = async (key: string) => {
		await settings.set("stripeApiKey", key);
		setAppSettings((prev) => ({ ...prev, stripeApiKey: key }));
		setInputMode(null);
		showMessage("Stripe API key updated");
	};

	const handleUpdateTimezone = async (tz: string) => {
		const value = tz.trim() || "auto";
		await settings.set("timezone", value);
		setAppSettings((prev) => ({ ...prev, timezone: value }));
		setInputMode(null);
		showMessage(`Timezone set to ${value === "auto" ? "auto-detect" : value}`);
	};

	// Modal handlers
	const handleCreateProject = async (name: string, rate: number | null) => {
		await projects.create({ name, hourlyRate: rate });
		showMessage(`Created project: ${name}`);
		setInputMode(null);
		loadProjects();
		loadDashboard();
	};

	const handleEditProject = async (name: string, rate: number | null) => {
		const project = projectList[selectedProjectIndex];
		if (project) {
			await projects.update(project.id, { name, hourlyRate: rate });
			showMessage(`Updated project: ${name}`);
			setInputMode(null);
			loadProjects();
		}
	};

	const handleCreateTask = async (title: string) => {
		const project = projectList[selectedProjectIndex];
		if (project) {
			await tasks.create({ title, projectId: project.id });
			showMessage(`Created task: ${title}`);
			setInputMode(null);
			loadTasks();
			loadDashboard();
		}
	};

	const handleEditTask = async (title: string) => {
		const task = taskList[selectedTaskIndex];
		if (task) {
			await tasks.update(task.id, { title });
			showMessage(`Updated task: ${title}`);
			setInputMode(null);
			loadTasks();
		}
	};

	const handleEditDashboardTask = async (title: string) => {
		const task = recentTasks[selectedDashboardTaskIndex];
		if (task) {
			await tasks.update(task.id, { title });
			showMessage(`Updated task: ${title}`);
			setInputMode(null);
			loadDashboard();
		}
	};

	// Customer handlers
	const handleCreateCustomer = async (name: string, email: string) => {
		try {
			await customers.create({ name, email });
			showMessage(`Created customer: ${name}`);
			setInputMode(null);
			loadCustomers();
			// Go back to select_customer mode
			setInputMode("select_customer");
		} catch (error) {
			showMessage(`Error creating customer: ${error}`);
		}
	};

	const handleEditCustomer = async (
		name: string,
		email: string,
		stripeCustomerId?: string,
	) => {
		if (!editingCustomer) return;
		try {
			await customers.update(editingCustomer.id, {
				name,
				email,
				stripeCustomerId: stripeCustomerId || null,
			});
			showMessage(`Updated customer: ${name}`);
			setInputMode(null);
			setEditingCustomer(null);
			loadCustomers();
			// Go back to select_customer mode
			setInputMode("select_customer");
		} catch (error) {
			showMessage(`Error updating customer: ${error}`);
		}
	};

	const handleSelectCustomer = async (customerId: string | null) => {
		const project = projectList[selectedProjectIndex];
		if (project) {
			await projects.setCustomer(project.id, customerId);
			showMessage(
				customerId
					? "Customer linked to project"
					: "Customer removed from project",
			);
			setInputMode(null);
			loadProjects();
		}
	};

	// Timesheet handlers
	const handleEditTimeEntry = async (
		startTime: Date,
		endTime: Date,
		description: string,
	) => {
		if (!editingTimeEntry) return;
		await timeEntries.update(editingTimeEntry.id, {
			startTime,
			endTime,
			description,
		});
		showMessage("Time entry updated");
		setInputMode(null);
		setEditingTimeEntry(null);
		loadTimesheets();
	};

	const handleCreateInvoice = async () => {
		const currentGroup = timesheetGroups[selectedTimesheetGroupIndex];
		if (!currentGroup || !currentGroup.project.customer) {
			showMessage("No customer linked to project");
			return;
		}

		if (!appSettings.stripeApiKey) {
			showMessage("No Stripe API key configured");
			return;
		}

		// Get selected entries or all entries in current group
		const selectedInGroup = currentGroup.entries.filter((e) =>
			selectedTimeEntryIds.has(e.id),
		);
		const entriesToInvoice =
			selectedInGroup.length > 0 ? selectedInGroup : currentGroup.entries;

		// Calculate totals
		const totalMs = entriesToInvoice.reduce((sum, e) => {
			if (!e.endTime) return sum;
			return (
				sum + (new Date(e.endTime).getTime() - new Date(e.startTime).getTime())
			);
		}, 0);
		const totalHours = totalMs / 3600000;
		const rate = currentGroup.project.hourlyRate ?? 0;
		const totalAmount = totalHours * rate;

		try {
			const customer = currentGroup.project.customer;

			// Get or create Stripe customer
			const stripeCustomerId = await getOrCreateStripeCustomer(
				appSettings.stripeApiKey,
				customer,
			);

			// Update our customer record with Stripe ID if needed
			if (stripeCustomerId !== customer.stripeCustomerId) {
				await customers.updateStripeId(customer.id, stripeCustomerId);
			}

			// Create line items from time entries
			const lineItems = entriesToInvoice
				.filter((e) => e.endTime) // Only include completed entries
				.map((e) => ({
					description:
						e.description ||
						`Time entry ${new Date(e.startTime).toLocaleDateString()}`,
					hours:
						(new Date(e.endTime!).getTime() -
							new Date(e.startTime).getTime()) /
						3600000,
					rate,
					startTime: new Date(e.startTime),
					endTime: new Date(e.endTime!),
				}));

			// Create Stripe draft invoice
			const stripeInvoiceId = await createDraftInvoice(
				appSettings.stripeApiKey,
				stripeCustomerId,
				currentGroup.project.name,
				lineItems,
			);

			// Create local invoice record
			const invoice = await invoices.create({
				projectId: currentGroup.project.id,
				customerId: currentGroup.project.customer.id,
				totalHours,
				totalAmount,
				timeEntryIds: entriesToInvoice.map((e) => e.id),
			});

			// Update with Stripe invoice ID
			await invoices.updateStripeId(invoice.id, stripeInvoiceId);

			showMessage(`Stripe draft invoice created: ${stripeInvoiceId}`);

			// Clear selections and reload
			setSelectedTimeEntryIds(new Set());
			setInputMode(null);
			loadTimesheets();
		} catch (error) {
			showMessage(`Error creating invoice: ${error}`);
		}
	};

	const selectedProject = projectList[selectedProjectIndex];

	// Show splash screen on boot
	if (showSplash) {
		return <SplashScreen />;
	}

	return (
		<box
			style={{
				width: "100%",
				height: "100%",
				flexDirection: "column",
			}}
		>
			<Header
				currentView={currentView}
				onViewChange={setCurrentView}
				runningTimer={runningTimer}
				onStopTimer={() => setInputMode("stop_timer")}
			/>

			<box style={{ flexGrow: 1, flexDirection: "row" }}>
				{currentView === "dashboard" && (
					<Dashboard
						stats={dashboardStats}
						recentTasks={recentTasks}
						selectedIndex={selectedDashboardTaskIndex}
						focused={true}
					/>
				)}

				{currentView === "help" && <HelpView />}

				{currentView === "settings" && (
					<SettingsView
						settings={appSettings}
						selectedIndex={selectedSettingsIndex}
						onEditBusinessName={() => setInputMode("edit_business_name")}
						onEditStripeKey={() => setInputMode("edit_stripe_key")}
						onEditTimezone={() => setInputMode("edit_timezone")}
						onExportDatabase={handleExportDatabase}
						onImportDatabase={() => {
							setConfirmMessage("Import will replace all data. Continue?");
							setConfirmAction(() => () => handleImportDatabase());
						}}
					/>
				)}

				{currentView === "timesheets" && (
					<TimesheetView
						groups={timesheetGroups}
						selectedGroupIndex={selectedTimesheetGroupIndex}
						selectedEntryIndex={selectedTimeEntryIndex}
						selectedEntryIds={selectedTimeEntryIds}
						focused={true}
						timezone={getEffectiveTimezone(appSettings)}
					/>
				)}

				{currentView === "invoices" && (
					<InvoicesView
						invoices={stripeInvoices}
						selectedIndex={selectedInvoiceIndex}
						focused={true}
						loading={invoicesLoading}
						error={invoicesError}
						hasStripeKey={!!appSettings.stripeApiKey}
						currentPage={invoicesPage}
						hasMore={invoicesHasMore}
						hasPrevious={invoicesCursors.length > 0}
					/>
				)}

				{(currentView === "projects" || currentView === "tasks") && (
					<>
						<box style={{ width: "40%", flexDirection: "column" }}>
							<ProjectList
								projects={projectList}
								selectedIndex={selectedProjectIndex}
								focused={activePanel === "projects"}
								showArchived={showArchived}
							/>
						</box>
						<box style={{ width: "60%", flexDirection: "column" }}>
							<TaskList
								tasks={taskList}
								selectedIndex={selectedTaskIndex}
								focused={activePanel === "tasks"}
								projectName={selectedProject?.name}
							/>
						</box>
					</>
				)}
			</box>

			<StatusBar
				message={statusMessage}
				mode={inputMode || undefined}
				timerRunning={!!runningTimer}
				currentView={currentView}
				activePanel={activePanel}
			/>

			{/* Modals */}
			{inputMode === "create_project" && (
				<ProjectModal
					mode="create"
					onSubmit={handleCreateProject}
					onCancel={() => setInputMode(null)}
				/>
			)}

			{inputMode === "edit_project" && selectedProject && (
				<ProjectModal
					mode="edit"
					initialName={selectedProject.name}
					initialRate={selectedProject.hourlyRate}
					onSubmit={handleEditProject}
					onCancel={() => setInputMode(null)}
				/>
			)}

			{inputMode === "create_task" && (
				<InputModal
					mode={inputMode}
					title="Create New Task"
					placeholder="Task title..."
					onSubmit={handleCreateTask}
					onCancel={() => setInputMode(null)}
				/>
			)}

			{inputMode === "edit_task" && taskList[selectedTaskIndex] && (
				<InputModal
					mode={inputMode}
					title="Edit Task"
					initialValue={taskList[selectedTaskIndex]?.title || ""}
					placeholder="Task title..."
					onSubmit={handleEditTask}
					onCancel={() => setInputMode(null)}
				/>
			)}

			{inputMode === "edit_dashboard_task" &&
				recentTasks[selectedDashboardTaskIndex] && (
					<InputModal
						mode={inputMode}
						title="Edit Task"
						initialValue={recentTasks[selectedDashboardTaskIndex]?.title || ""}
						placeholder="Task title..."
						onSubmit={handleEditDashboardTask}
						onCancel={() => setInputMode(null)}
					/>
				)}

			{inputMode === "edit_business_name" && (
				<InputModal
					mode={inputMode}
					title="Business Name"
					initialValue={appSettings.businessName}
					placeholder="Enter business name..."
					onSubmit={handleUpdateBusinessName}
					onCancel={() => setInputMode(null)}
				/>
			)}

			{inputMode === "edit_stripe_key" && (
				<InputModal
					mode={inputMode}
					title="Stripe API Key"
					initialValue={appSettings.stripeApiKey}
					placeholder="sk_live_..."
					onSubmit={handleUpdateStripeKey}
					onCancel={() => setInputMode(null)}
				/>
			)}

			{inputMode === "edit_timezone" && (
				<InputModal
					mode={inputMode}
					title="Timezone (IANA format or 'auto')"
					initialValue={appSettings.timezone}
					placeholder="America/New_York, Europe/London, auto..."
					onSubmit={handleUpdateTimezone}
					onCancel={() => setInputMode(null)}
				/>
			)}

			{inputMode === "select_timer_project" && (
				<ProjectSelectModal
					projects={projectList.filter((p) => !p.archived)}
					onSelect={handleStartTimer}
					onCancel={() => setInputMode(null)}
				/>
			)}

			{inputMode === "stop_timer" && runningTimer && (
				<StopTimerModal
					projectName={runningTimer.project.name}
					projectColor={runningTimer.project.color}
					duration={formatDuration(timerElapsed)}
					onSubmit={handleStopTimer}
					onCancel={() => setInputMode(null)}
				/>
			)}

			{inputMode === "select_customer" && selectedProject && (
				<CustomerSelectModal
					customers={customerList}
					currentCustomerId={(selectedProject as any).customerId}
					projectName={selectedProject.name}
					onSelect={handleSelectCustomer}
					onCreateNew={() => setInputMode("create_customer")}
					onEdit={(customer) => {
						setEditingCustomer(customer);
						setInputMode("edit_customer");
					}}
					onCancel={() => setInputMode(null)}
				/>
			)}

			{inputMode === "create_customer" && (
				<CustomerModal
					mode="create"
					onSubmit={handleCreateCustomer}
					onCancel={() => setInputMode("select_customer")}
				/>
			)}

			{inputMode === "edit_customer" && editingCustomer && (
				<CustomerModal
					mode="edit"
					initialName={editingCustomer.name}
					initialEmail={editingCustomer.email}
					initialStripeId={editingCustomer.stripeCustomerId || ""}
					onSubmit={handleEditCustomer}
					onCancel={() => {
						setEditingCustomer(null);
						setInputMode("select_customer");
					}}
				/>
			)}

			{inputMode === "edit_time_entry" && editingTimeEntry && (
				<EditTimeEntryModal
					entry={editingTimeEntry}
					timezone={getEffectiveTimezone(appSettings)}
					onSubmit={handleEditTimeEntry}
					onCancel={() => {
						setInputMode(null);
						setEditingTimeEntry(null);
					}}
				/>
			)}

			{inputMode === "create_invoice" &&
				timesheetGroups[selectedTimesheetGroupIndex] && (
					<CreateInvoiceModal
						projectName={
							timesheetGroups[selectedTimesheetGroupIndex].project.name
						}
						projectColor={
							timesheetGroups[selectedTimesheetGroupIndex].project.color
						}
						hourlyRate={
							timesheetGroups[selectedTimesheetGroupIndex].project.hourlyRate
						}
						customer={
							timesheetGroups[selectedTimesheetGroupIndex].project.customer
						}
						entries={(() => {
							const group = timesheetGroups[selectedTimesheetGroupIndex];
							const selectedInGroup = group.entries.filter((e) =>
								selectedTimeEntryIds.has(e.id),
							);
							return selectedInGroup.length > 0
								? selectedInGroup
								: group.entries;
						})()}
						timezone={getEffectiveTimezone(appSettings)}
						hasStripeKey={!!appSettings.stripeApiKey}
						onConfirm={handleCreateInvoice}
						onCancel={() => setInputMode(null)}
					/>
				)}

			{confirmAction && (
				<ConfirmModal
					title="Confirm Delete"
					message={confirmMessage}
					onConfirm={() => {
						confirmAction();
						setConfirmAction(null);
						setConfirmMessage("");
					}}
					onCancel={() => {
						setConfirmAction(null);
						setConfirmMessage("");
					}}
				/>
			)}
		</box>
	);
}
