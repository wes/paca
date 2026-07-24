// Paca - Reporting & analytics engine
//
// Pure functions over time entries. The database layer hands raw rows in here
// and everything the Reports view renders is derived from `buildReports()`.
// Keeping it free of Prisma/React makes the numbers easy to reason about.

// ---------------------------------------------------------------------------
// Source & normalized shapes
// ---------------------------------------------------------------------------

export interface ReportSourceEntry {
	id: string;
	startTime: Date | string;
	endTime: Date | string | null;
	description?: string | null;
	invoiceId?: string | null;
	project: {
		id: string;
		name: string;
		color: string;
		hourlyRate: number | null;
		customer?: { id: string; name: string } | null;
	};
}

export interface NormalEntry {
	id: string;
	start: Date;
	end: Date;
	ms: number;
	hours: number;
	projectId: string;
	projectName: string;
	projectColor: string;
	rate: number | null;
	customerId: string | null;
	customerName: string | null;
	amount: number;
	billable: boolean;
	invoiced: boolean;
	description: string | null;
}

/** A single column of a bar chart: one day / week / month of tracked time. */
export interface TimeSeriesPoint {
	key: string;
	start: Date;
	label: string;
	labelLong: string;
	ms: number;
	hours: number;
	amount: number;
	entryCount: number;
	/** Distinct calendar days with tracked time inside this bucket. */
	activeDays: number;
	projects: {
		projectId: string;
		projectName: string;
		projectColor: string;
		ms: number;
		amount: number;
	}[];
}

export type Granularity = "day" | "week" | "month";

// ---------------------------------------------------------------------------
// Date helpers (all local-time, matching how entries are displayed elsewhere)
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const AVG_DAYS_PER_MONTH = 365.25 / 12;

export function startOfDay(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

export function startOfWeek(d: Date): Date {
	const x = startOfDay(d);
	x.setDate(x.getDate() - x.getDay());
	return x;
}

export function startOfMonth(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
	const x = new Date(d);
	x.setMonth(x.getMonth() + n);
	return x;
}

function pad2(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

export function dayKey(d: Date): string {
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function bucketStart(d: Date, granularity: Granularity): Date {
	if (granularity === "day") return startOfDay(d);
	if (granularity === "week") return startOfWeek(d);
	return startOfMonth(d);
}

function nextBucket(d: Date, granularity: Granularity): Date {
	if (granularity === "month") return addMonths(d, 1);
	const x = new Date(d);
	x.setDate(x.getDate() + (granularity === "week" ? 7 : 1));
	// Guard against DST shifts pushing us off midnight
	x.setHours(0, 0, 0, 0);
	return x;
}

function bucketLabels(d: Date, granularity: Granularity): {
	label: string;
	labelLong: string;
} {
	if (granularity === "month") {
		const m = MONTH_NAMES[d.getMonth()]!;
		return {
			label: d.getMonth() === 0 ? `${m} ${String(d.getFullYear()).slice(2)}` : m,
			labelLong: `${m} ${d.getFullYear()}`,
		};
	}
	const short = `${d.getMonth() + 1}/${d.getDate()}`;
	if (granularity === "week") {
		return { label: short, labelLong: `Week of ${short}` };
	}
	return { label: short, labelLong: `${DOW_NAMES[d.getDay()]} ${short}` };
}

// ---------------------------------------------------------------------------
// Formatting helpers (shared by every report component)
// ---------------------------------------------------------------------------

export function formatHours(hours: number): string {
	if (!isFinite(hours) || hours === 0) return "0h";
	if (hours < 1) {
		const minutes = Math.round(hours * 60);
		// Don't render a non-zero amount of time as "0m".
		return minutes === 0 ? "<1m" : `${minutes}m`;
	}
	if (hours < 100) return `${hours.toFixed(1)}h`;
	return `${Math.round(hours)}h`;
}

export function formatHoursMs(ms: number): string {
	return formatHours(ms / 3_600_000);
}

export function formatMoney(amount: number): string {
	if (!isFinite(amount) || amount === 0) return "$0";
	const abs = Math.abs(amount);
	const sign = amount < 0 ? "-" : "";
	if (abs >= 100_000) return `${sign}$${Math.round(abs / 1000)}k`;
	if (abs >= 1000)
		return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
	return `${sign}$${abs.toFixed(abs < 100 ? 2 : 0)}`;
}

export function formatMoneyExact(amount: number): string {
	const sign = amount < 0 ? "-" : "";
	return `${sign}$${Math.abs(amount).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

export function formatPercent(fraction: number): string {
	if (!isFinite(fraction)) return "—";
	return `${Math.round(fraction * 100)}%`;
}

export function formatDelta(fraction: number | null): string {
	if (fraction === null || !isFinite(fraction)) return "—";
	const pct = Math.round(fraction * 100);
	if (pct === 0) return "0%";
	return `${pct > 0 ? "+" : ""}${pct}%`;
}

export function formatClock(ms: number): string {
	const totalMinutes = Math.round(ms / 60_000);
	const h = Math.floor(totalMinutes / 60);
	const m = totalMinutes % 60;
	if (h === 0) return `${m}m`;
	return `${h}h ${pad2(m)}m`;
}

function safeDiv(a: number, b: number): number {
	return b > 0 ? a / b : 0;
}

function deltaPct(current: number, previous: number): number | null {
	if (previous <= 0) return current > 0 ? null : 0;
	return (current - previous) / previous;
}

// ---------------------------------------------------------------------------
// Normalization & bucketing
// ---------------------------------------------------------------------------

export function normalizeEntries(rows: ReportSourceEntry[]): NormalEntry[] {
	const out: NormalEntry[] = [];
	for (const row of rows) {
		if (!row.endTime) continue;
		const start = new Date(row.startTime);
		const end = new Date(row.endTime);
		const ms = end.getTime() - start.getTime();
		if (!isFinite(ms) || ms <= 0) continue;

		const hours = ms / 3_600_000;
		const rate = row.project.hourlyRate ?? null;
		out.push({
			id: row.id,
			start,
			end,
			ms,
			hours,
			projectId: row.project.id,
			projectName: row.project.name,
			projectColor: row.project.color,
			rate,
			customerId: row.project.customer?.id ?? null,
			customerName: row.project.customer?.name ?? null,
			amount: rate ? hours * rate : 0,
			billable: rate !== null && rate > 0,
			invoiced: !!row.invoiceId,
			description: row.description ?? null,
		});
	}
	out.sort((a, b) => a.start.getTime() - b.start.getTime());
	return out;
}

/**
 * Group entries into a *continuous* series of buckets. Empty periods are kept
 * as zero-height columns so a chart's x-axis stays linear in time — the old
 * dashboard chart silently dropped them, which made gaps invisible.
 */
export function buildSeries(
	entries: NormalEntry[],
	granularity: Granularity,
	range?: { from?: Date; to?: Date },
): TimeSeriesPoint[] {
	const buckets = new Map<string, TimeSeriesPoint>();
	const bucketDays = new Map<string, Set<string>>();

	const makePoint = (start: Date): TimeSeriesPoint => {
		const { label, labelLong } = bucketLabels(start, granularity);
		return {
			key: dayKey(start),
			start,
			label,
			labelLong,
			ms: 0,
			hours: 0,
			amount: 0,
			entryCount: 0,
			activeDays: 0,
			projects: [],
		};
	};

	for (const e of entries) {
		const bStart = bucketStart(e.start, granularity);
		const key = dayKey(bStart);
		let point = buckets.get(key);
		if (!point) {
			point = makePoint(bStart);
			buckets.set(key, point);
			bucketDays.set(key, new Set());
		}
		point.ms += e.ms;
		point.hours += e.hours;
		point.amount += e.amount;
		point.entryCount += 1;
		bucketDays.get(key)!.add(dayKey(startOfDay(e.start)));

		let proj = point.projects.find((p) => p.projectId === e.projectId);
		if (!proj) {
			proj = {
				projectId: e.projectId,
				projectName: e.projectName,
				projectColor: e.projectColor,
				ms: 0,
				amount: 0,
			};
			point.projects.push(proj);
		}
		proj.ms += e.ms;
		proj.amount += e.amount;
	}

	const keys = Array.from(buckets.keys()).sort();
	const firstFilled = keys[0];
	const lastFilled = keys[keys.length - 1];

	const from = range?.from
		? bucketStart(range.from, granularity)
		: firstFilled
			? buckets.get(firstFilled)!.start
			: null;
	const to = range?.to
		? bucketStart(range.to, granularity)
		: lastFilled
			? buckets.get(lastFilled)!.start
			: null;

	if (!from || !to) return [];

	const series: TimeSeriesPoint[] = [];
	let cursor = new Date(from);
	// Safety valve: a day-granularity series over many years shouldn't run away.
	let guard = 0;
	while (cursor.getTime() <= to.getTime() && guard++ < 20000) {
		const key = dayKey(cursor);
		series.push(buckets.get(key) ?? makePoint(new Date(cursor)));
		cursor = nextBucket(cursor, granularity);
	}

	// Sort each bucket's projects biggest-first for stable stacking
	for (const point of series) {
		point.projects.sort((a, b) => b.ms - a.ms);
		point.activeDays = bucketDays.get(point.key)?.size ?? 0;
	}
	return series;
}

// ---------------------------------------------------------------------------
// Report shapes
// ---------------------------------------------------------------------------

export interface PeriodTotals {
	hours: number;
	amount: number;
	entries: number;
	activeDays: number;
}

export interface PeriodComparison {
	label: string;
	current: PeriodTotals;
	previous: PeriodTotals;
	hoursDelta: number | null;
	amountDelta: number | null;
}

export interface WindowAverages {
	label: string; // "Last 1 month"
	months: number;
	start: Date;
	end: Date;
	spanDays: number;
	partial: boolean; // data doesn't cover the whole window
	totalHours: number;
	totalAmount: number;
	activeDays: number;
	entries: number;
	avgHoursPerWeek: number;
	avgAmountPerWeek: number;
	avgHoursPerMonth: number;
	avgAmountPerMonth: number;
	avgHoursPerCalendarDay: number;
	avgHoursPerActiveDay: number;
	avgAmountPerActiveDay: number;
	effectiveRate: number; // amount / billable hours
	blendedRate: number; // amount / all hours
	busiestWeekHours: number;
}

export interface ProjectReport {
	projectId: string;
	name: string;
	color: string;
	hours: number;
	amount: number;
	rate: number | null;
	share: number;
	entries: number;
	activeDays: number;
	avgSessionHours: number;
	firstEntry: Date;
	lastEntry: Date;
	last30Hours: number;
	last90Hours: number;
	last365Hours: number;
	customerName: string | null;
}

/** Values measured over the rolling 30/90/365-day windows ending today. */
export interface WindowValues {
	d30: number;
	d90: number;
	d365: number;
}

export const WINDOW_DAYS: WindowValues = { d30: 30, d90: 90, d365: 365 };

export interface CustomerProjectReport {
	projectId: string;
	name: string;
	hours: number;
	amount: number;
	rate: number | null;
	lastEntry: Date;
	/** Tracked hours inside each rolling window. */
	windowHours: WindowValues;
	/** Hours per week inside each rolling window. */
	weeklyAvg: WindowValues;
}

export interface CustomerReport {
	customerId: string;
	name: string;
	hours: number;
	amount: number;
	share: number;
	projectCount: number;
	invoicedAmount: number;
	uninvoicedAmount: number;
	lastEntry: Date;
	windowHours: WindowValues;
	weeklyAvg: WindowValues;
	/** Which projects roll up into this client, biggest first. */
	projects: CustomerProjectReport[];
	/** True for the synthetic bucket holding projects with no customer set. */
	unassigned: boolean;
}

export interface DowReport {
	day: number;
	name: string;
	hours: number;
	amount: number;
	share: number;
	occurrences: number;
	avgHours: number;
}

export interface HourReport {
	hour: number;
	hours: number;
	share: number;
}

export interface SessionReport {
	count: number;
	avgMs: number;
	medianMs: number;
	longestMs: number;
	longestLabel: string;
	shortestMs: number;
	avgPerActiveDay: number;
	under15mCount: number;
	over4hCount: number;
}

export interface StreakReport {
	current: number;
	longest: number;
	longestEndLabel: string;
	activeDays: number;
	spanDays: number;
	coverage: number;
	firstDay: Date | null;
	lastDay: Date | null;
	trackedToday: boolean;
}

export interface RecordItem {
	label: string;
	hours: number;
	amount: number;
}

export interface RecordsReport {
	bestDay: RecordItem | null;
	bestWeek: RecordItem | null;
	bestMonth: RecordItem | null;
	topEarningMonth: RecordItem | null;
}

export interface BillingReport {
	lifetimeHours: number;
	lifetimeEarnings: number;
	billableHours: number;
	nonBillableHours: number;
	billableShare: number;
	invoicedHours: number;
	invoicedAmount: number;
	uninvoicedHours: number;
	uninvoicedAmount: number;
	unratedHours: number; // tracked against projects with no hourly rate
	avgRate: number;
	highestRate: number | null;
	lowestRate: number | null;
}

export interface ForecastReport {
	daysElapsed: number;
	daysInMonth: number;
	monthHours: number;
	monthAmount: number;
	projectedHours: number;
	projectedAmount: number;
	paceVsLastMonth: number | null;
	runRateAnnualAmount: number;
}

export interface ReportsData {
	generatedAt: Date;
	isEmpty: boolean;
	firstEntry: Date | null;
	lastEntry: Date | null;
	totalEntries: number;

	weekly: TimeSeriesPoint[]; // last ~26 weeks, gap-filled
	weeklyAll: TimeSeriesPoint[]; // every week since the first entry
	monthly: TimeSeriesPoint[]; // last 12 months, gap-filled
	daily30: TimeSeriesPoint[]; // last 30 days, gap-filled

	comparisons: PeriodComparison[];
	averages: WindowAverages[];
	projects: ProjectReport[];
	customers: CustomerReport[];
	dayOfWeek: DowReport[];
	hourOfDay: HourReport[];
	sessions: SessionReport;
	streaks: StreakReport;
	records: RecordsReport;
	billing: BillingReport;
	forecast: ForecastReport;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function totalsFor(entries: NormalEntry[]): PeriodTotals {
	const days = new Set<string>();
	let hours = 0;
	let amount = 0;
	for (const e of entries) {
		hours += e.hours;
		amount += e.amount;
		days.add(dayKey(startOfDay(e.start)));
	}
	return { hours, amount, entries: entries.length, activeDays: days.size };
}

function inRange(entries: NormalEntry[], from: Date, to: Date): NormalEntry[] {
	const f = from.getTime();
	const t = to.getTime();
	return entries.filter((e) => {
		const s = e.start.getTime();
		return s >= f && s < t;
	});
}

function buildComparisons(
	entries: NormalEntry[],
	now: Date,
): PeriodComparison[] {
	const today = startOfDay(now);
	const tomorrow = new Date(today.getTime() + DAY_MS);

	const weekStart = startOfWeek(now);
	const prevWeekStart = new Date(weekStart.getTime() - 7 * DAY_MS);
	const monthStart = startOfMonth(now);
	const prevMonthStart = addMonths(monthStart, -1);
	const yearStart = new Date(now.getFullYear(), 0, 1);
	const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);

	const yesterday = new Date(today.getTime() - DAY_MS);
	const last30Start = new Date(today.getTime() - 30 * DAY_MS);
	const prev30Start = new Date(today.getTime() - 60 * DAY_MS);

	const specs: { label: string; cur: [Date, Date]; prev: [Date, Date] }[] = [
		{
			label: "Today",
			cur: [today, tomorrow],
			prev: [yesterday, today],
		},
		{
			label: "This week",
			cur: [weekStart, tomorrow],
			prev: [prevWeekStart, weekStart],
		},
		{
			label: "This month",
			cur: [monthStart, tomorrow],
			prev: [prevMonthStart, monthStart],
		},
		{
			label: "Last 30 days",
			cur: [last30Start, tomorrow],
			prev: [prev30Start, last30Start],
		},
		{
			label: "This year",
			cur: [yearStart, tomorrow],
			prev: [prevYearStart, yearStart],
		},
	];

	return specs.map((spec) => {
		const current = totalsFor(inRange(entries, spec.cur[0], spec.cur[1]));
		const previous = totalsFor(inRange(entries, spec.prev[0], spec.prev[1]));
		return {
			label: spec.label,
			current,
			previous,
			hoursDelta: deltaPct(current.hours, previous.hours),
			amountDelta: deltaPct(current.amount, previous.amount),
		};
	});
}

function buildWindowAverages(
	entries: NormalEntry[],
	now: Date,
	months: number,
	label: string,
	firstEntry: Date | null,
): WindowAverages {
	const end = new Date(startOfDay(now).getTime() + DAY_MS);
	const requestedStart = startOfDay(addMonths(now, -months));
	// Don't dilute averages with time before any data existed.
	const start =
		firstEntry && firstEntry.getTime() > requestedStart.getTime()
			? startOfDay(firstEntry)
			: requestedStart;
	const partial = !!firstEntry && firstEntry.getTime() > requestedStart.getTime();

	const windowEntries = inRange(entries, start, end);
	const totals = totalsFor(windowEntries);

	const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS));
	const weeks = Math.max(spanDays / 7, 1 / 7);
	const monthsSpanned = Math.max(spanDays / AVG_DAYS_PER_MONTH, 1 / 30);

	let billableHours = 0;
	for (const e of windowEntries) if (e.billable) billableHours += e.hours;

	const weeklySeries = buildSeries(windowEntries, "week");
	const busiestWeekHours = weeklySeries.reduce(
		(max, w) => Math.max(max, w.hours),
		0,
	);

	return {
		label,
		months,
		start,
		end,
		spanDays,
		partial,
		totalHours: totals.hours,
		totalAmount: totals.amount,
		activeDays: totals.activeDays,
		entries: totals.entries,
		avgHoursPerWeek: safeDiv(totals.hours, weeks),
		avgAmountPerWeek: safeDiv(totals.amount, weeks),
		avgHoursPerMonth: safeDiv(totals.hours, monthsSpanned),
		avgAmountPerMonth: safeDiv(totals.amount, monthsSpanned),
		avgHoursPerCalendarDay: safeDiv(totals.hours, spanDays),
		avgHoursPerActiveDay: safeDiv(totals.hours, totals.activeDays),
		avgAmountPerActiveDay: safeDiv(totals.amount, totals.activeDays),
		effectiveRate: safeDiv(totals.amount, billableHours),
		blendedRate: safeDiv(totals.amount, totals.hours),
		busiestWeekHours,
	};
}

function buildProjectReports(
	entries: NormalEntry[],
	now: Date,
	totalHours: number,
): ProjectReport[] {
	const today = startOfDay(now).getTime();
	const last30Cutoff = today - 30 * DAY_MS;
	const last90Cutoff = today - 90 * DAY_MS;
	const last365Cutoff = today - 365 * DAY_MS;
	const map = new Map<
		string,
		ProjectReport & { _days: Set<string> }
	>();

	for (const e of entries) {
		let p = map.get(e.projectId);
		if (!p) {
			p = {
				projectId: e.projectId,
				name: e.projectName,
				color: e.projectColor,
				hours: 0,
				amount: 0,
				rate: e.rate,
				share: 0,
				entries: 0,
				activeDays: 0,
				avgSessionHours: 0,
				firstEntry: e.start,
				lastEntry: e.start,
				last30Hours: 0,
				last90Hours: 0,
				last365Hours: 0,
				customerName: e.customerName,
				_days: new Set<string>(),
			};
			map.set(e.projectId, p);
		}
		p.hours += e.hours;
		p.amount += e.amount;
		p.entries += 1;
		p._days.add(dayKey(startOfDay(e.start)));
		if (e.start.getTime() < p.firstEntry.getTime()) p.firstEntry = e.start;
		if (e.start.getTime() > p.lastEntry.getTime()) p.lastEntry = e.start;
		const startedAt = e.start.getTime();
		if (startedAt >= last30Cutoff) p.last30Hours += e.hours;
		if (startedAt >= last90Cutoff) p.last90Hours += e.hours;
		if (startedAt >= last365Cutoff) p.last365Hours += e.hours;
	}

	return Array.from(map.values())
		.map((p) => {
			const { _days, ...rest } = p;
			return {
				...rest,
				activeDays: _days.size,
				avgSessionHours: safeDiv(p.hours, p.entries),
				share: safeDiv(p.hours, totalHours),
			};
		})
		.sort((a, b) => b.hours - a.hours);
}

const UNASSIGNED_CUSTOMER_ID = "__none__";

function emptyWindows(): WindowValues {
	return { d30: 0, d90: 0, d365: 0 };
}

/** Convert hours accumulated in each window into an hours-per-week average. */
function toWeeklyAvg(hours: WindowValues): WindowValues {
	return {
		d30: hours.d30 / (WINDOW_DAYS.d30 / 7),
		d90: hours.d90 / (WINDOW_DAYS.d90 / 7),
		d365: hours.d365 / (WINDOW_DAYS.d365 / 7),
	};
}

function buildCustomerReports(
	entries: NormalEntry[],
	now: Date,
	totalHours: number,
): CustomerReport[] {
	const today = startOfDay(now).getTime();
	const cutoffs: WindowValues = {
		d30: today - WINDOW_DAYS.d30 * DAY_MS,
		d90: today - WINDOW_DAYS.d90 * DAY_MS,
		d365: today - WINDOW_DAYS.d365 * DAY_MS,
	};

	const addWindowed = (target: WindowValues, startedAt: number, hours: number) => {
		if (startedAt >= cutoffs.d30) target.d30 += hours;
		if (startedAt >= cutoffs.d90) target.d90 += hours;
		if (startedAt >= cutoffs.d365) target.d365 += hours;
	};

	const map = new Map<
		string,
		CustomerReport & { _projects: Map<string, CustomerProjectReport> }
	>();

	for (const e of entries) {
		const id = e.customerId ?? UNASSIGNED_CUSTOMER_ID;
		const name = e.customerName ?? "Unassigned";
		let c = map.get(id);
		if (!c) {
			c = {
				customerId: id,
				name,
				hours: 0,
				amount: 0,
				share: 0,
				projectCount: 0,
				invoicedAmount: 0,
				uninvoicedAmount: 0,
				lastEntry: e.start,
				windowHours: emptyWindows(),
				weeklyAvg: emptyWindows(),
				projects: [],
				unassigned: id === UNASSIGNED_CUSTOMER_ID,
				_projects: new Map(),
			};
			map.set(id, c);
		}
		const startedAt = e.start.getTime();
		c.hours += e.hours;
		c.amount += e.amount;
		addWindowed(c.windowHours, startedAt, e.hours);
		if (e.invoiced) c.invoicedAmount += e.amount;
		else c.uninvoicedAmount += e.amount;
		if (startedAt > c.lastEntry.getTime()) c.lastEntry = e.start;

		let p = c._projects.get(e.projectId);
		if (!p) {
			p = {
				projectId: e.projectId,
				name: e.projectName,
				hours: 0,
				amount: 0,
				rate: e.rate,
				lastEntry: e.start,
				windowHours: emptyWindows(),
				weeklyAvg: emptyWindows(),
			};
			c._projects.set(e.projectId, p);
		}
		p.hours += e.hours;
		p.amount += e.amount;
		addWindowed(p.windowHours, startedAt, e.hours);
		if (startedAt > p.lastEntry.getTime()) p.lastEntry = e.start;
	}

	return Array.from(map.values())
		.map((c) => {
			const { _projects, ...rest } = c;
			return {
				...rest,
				projectCount: _projects.size,
				weeklyAvg: toWeeklyAvg(c.windowHours),
				projects: Array.from(_projects.values())
					.map((p) => ({ ...p, weeklyAvg: toWeeklyAvg(p.windowHours) }))
					.sort((a, b) => b.hours - a.hours),
				share: safeDiv(c.hours, totalHours),
			};
		})
		.sort((a, b) => {
			// Keep the "no client set" bucket last — it's a to-do list, not a client.
			if (a.unassigned !== b.unassigned) return a.unassigned ? 1 : -1;
			return b.amount - a.amount || b.hours - a.hours;
		});
}

function buildDayOfWeek(
	entries: NormalEntry[],
	firstEntry: Date | null,
	now: Date,
	totalHours: number,
): DowReport[] {
	const hoursByDow = new Array(7).fill(0) as number[];
	const amountByDow = new Array(7).fill(0) as number[];
	for (const e of entries) {
		const d = e.start.getDay();
		hoursByDow[d] = (hoursByDow[d] ?? 0) + e.hours;
		amountByDow[d] = (amountByDow[d] ?? 0) + e.amount;
	}

	// How many times each weekday has occurred over the tracked span
	const occurrences = new Array(7).fill(0) as number[];
	if (firstEntry) {
		const cursor = startOfDay(firstEntry);
		const last = startOfDay(now);
		let guard = 0;
		while (cursor.getTime() <= last.getTime() && guard++ < 20000) {
			const d = cursor.getDay();
			occurrences[d] = (occurrences[d] ?? 0) + 1;
			cursor.setDate(cursor.getDate() + 1);
		}
	}

	return DOW_NAMES.map((name, i) => ({
		day: i,
		name,
		hours: hoursByDow[i] ?? 0,
		amount: amountByDow[i] ?? 0,
		share: safeDiv(hoursByDow[i] ?? 0, totalHours),
		occurrences: occurrences[i] ?? 0,
		avgHours: safeDiv(hoursByDow[i] ?? 0, occurrences[i] ?? 0),
	}));
}

function buildHourOfDay(
	entries: NormalEntry[],
	totalHours: number,
): HourReport[] {
	const msByHour = new Array(24).fill(0) as number[];

	for (const e of entries) {
		let cursor = e.start.getTime();
		const end = e.end.getTime();
		let guard = 0;
		// Split a session across every clock hour it touches.
		while (cursor < end && guard++ < 24 * 40) {
			const d = new Date(cursor);
			const hourEnd = new Date(
				d.getFullYear(),
				d.getMonth(),
				d.getDate(),
				d.getHours() + 1,
				0,
				0,
				0,
			).getTime();
			const segmentEnd = Math.min(hourEnd, end);
			const h = d.getHours();
			msByHour[h] = (msByHour[h] ?? 0) + (segmentEnd - cursor);
			cursor = segmentEnd;
		}
	}

	return msByHour.map((ms, hour) => ({
		hour,
		hours: ms / 3_600_000,
		share: safeDiv(ms / 3_600_000, totalHours),
	}));
}

function buildSessions(entries: NormalEntry[]): SessionReport {
	if (entries.length === 0) {
		return {
			count: 0,
			avgMs: 0,
			medianMs: 0,
			longestMs: 0,
			longestLabel: "—",
			shortestMs: 0,
			avgPerActiveDay: 0,
			under15mCount: 0,
			over4hCount: 0,
		};
	}

	const sorted = [...entries].sort((a, b) => a.ms - b.ms);
	const mid = Math.floor(sorted.length / 2);
	const median =
		sorted.length % 2 === 0
			? ((sorted[mid - 1]?.ms ?? 0) + (sorted[mid]?.ms ?? 0)) / 2
			: (sorted[mid]?.ms ?? 0);

	const longest = sorted[sorted.length - 1]!;
	const totalMs = entries.reduce((sum, e) => sum + e.ms, 0);
	const days = new Set(entries.map((e) => dayKey(startOfDay(e.start))));

	return {
		count: entries.length,
		avgMs: totalMs / entries.length,
		medianMs: median,
		longestMs: longest.ms,
		longestLabel: `${longest.projectName} · ${MONTH_NAMES[longest.start.getMonth()]} ${longest.start.getDate()}`,
		shortestMs: sorted[0]!.ms,
		avgPerActiveDay: safeDiv(entries.length, days.size),
		under15mCount: entries.filter((e) => e.ms < 15 * 60_000).length,
		over4hCount: entries.filter((e) => e.ms >= 4 * 3_600_000).length,
	};
}

function buildStreaks(entries: NormalEntry[], now: Date): StreakReport {
	const days = new Set(entries.map((e) => dayKey(startOfDay(e.start))));
	if (days.size === 0) {
		return {
			current: 0,
			longest: 0,
			longestEndLabel: "—",
			activeDays: 0,
			spanDays: 0,
			coverage: 0,
			firstDay: null,
			lastDay: null,
			trackedToday: false,
		};
	}

	const sortedKeys = Array.from(days).sort();
	const first = new Date(`${sortedKeys[0]!}T00:00:00`);
	const last = new Date(`${sortedKeys[sortedKeys.length - 1]!}T00:00:00`);

	let longest = 0;
	let longestEnd = first;
	let run = 0;
	let prev: Date | null = null;
	for (const key of sortedKeys) {
		const d = new Date(`${key}T00:00:00`);
		if (prev && Math.round((d.getTime() - prev.getTime()) / DAY_MS) === 1) {
			run += 1;
		} else {
			run = 1;
		}
		if (run > longest) {
			longest = run;
			longestEnd = d;
		}
		prev = d;
	}

	// Current streak: count back from today (or yesterday if today is untracked)
	const today = startOfDay(now);
	const trackedToday = days.has(dayKey(today));
	let current = 0;
	const cursor = new Date(today);
	if (!trackedToday) cursor.setDate(cursor.getDate() - 1);
	let guard = 0;
	while (days.has(dayKey(cursor)) && guard++ < 20000) {
		current += 1;
		cursor.setDate(cursor.getDate() - 1);
	}

	const spanDays =
		Math.round((startOfDay(now).getTime() - first.getTime()) / DAY_MS) + 1;

	return {
		current,
		longest,
		longestEndLabel: `${MONTH_NAMES[longestEnd.getMonth()]} ${longestEnd.getDate()}`,
		activeDays: days.size,
		spanDays,
		coverage: safeDiv(days.size, spanDays),
		firstDay: first,
		lastDay: last,
		trackedToday,
	};
}

function pickRecord(
	series: TimeSeriesPoint[],
	by: "hours" | "amount",
): RecordItem | null {
	let best: TimeSeriesPoint | null = null;
	for (const p of series) {
		if (p.ms === 0) continue;
		if (!best || p[by] > best[by]) best = p;
	}
	if (!best) return null;
	return { label: best.labelLong, hours: best.hours, amount: best.amount };
}

function buildBilling(entries: NormalEntry[]): BillingReport {
	let lifetimeHours = 0;
	let lifetimeEarnings = 0;
	let billableHours = 0;
	let unratedHours = 0;
	let invoicedHours = 0;
	let invoicedAmount = 0;
	let uninvoicedHours = 0;
	let uninvoicedAmount = 0;
	let highestRate: number | null = null;
	let lowestRate: number | null = null;

	for (const e of entries) {
		lifetimeHours += e.hours;
		lifetimeEarnings += e.amount;
		if (e.billable) {
			billableHours += e.hours;
			if (highestRate === null || (e.rate ?? 0) > highestRate)
				highestRate = e.rate;
			if (lowestRate === null || (e.rate ?? 0) < lowestRate) lowestRate = e.rate;
			if (e.invoiced) {
				invoicedHours += e.hours;
				invoicedAmount += e.amount;
			} else {
				uninvoicedHours += e.hours;
				uninvoicedAmount += e.amount;
			}
		} else {
			unratedHours += e.hours;
		}
	}

	return {
		lifetimeHours,
		lifetimeEarnings,
		billableHours,
		nonBillableHours: unratedHours,
		billableShare: safeDiv(billableHours, lifetimeHours),
		invoicedHours,
		invoicedAmount,
		uninvoicedHours,
		uninvoicedAmount,
		unratedHours,
		avgRate: safeDiv(lifetimeEarnings, billableHours),
		highestRate,
		lowestRate,
	};
}

function buildForecast(entries: NormalEntry[], now: Date): ForecastReport {
	const monthStart = startOfMonth(now);
	const nextMonthStart = addMonths(monthStart, 1);
	const prevMonthStart = addMonths(monthStart, -1);

	const daysInMonth = Math.round(
		(nextMonthStart.getTime() - monthStart.getTime()) / DAY_MS,
	);
	const daysElapsed = Math.min(now.getDate(), daysInMonth);

	const thisMonth = totalsFor(inRange(entries, monthStart, nextMonthStart));
	const lastMonth = totalsFor(inRange(entries, prevMonthStart, monthStart));

	const pace = safeDiv(thisMonth.hours, daysElapsed);
	const amountPace = safeDiv(thisMonth.amount, daysElapsed);

	return {
		daysElapsed,
		daysInMonth,
		monthHours: thisMonth.hours,
		monthAmount: thisMonth.amount,
		projectedHours: pace * daysInMonth,
		projectedAmount: amountPace * daysInMonth,
		paceVsLastMonth: deltaPct(pace * daysInMonth, lastMonth.hours),
		runRateAnnualAmount: amountPace * 365,
	};
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function buildReports(
	rows: ReportSourceEntry[],
	now: Date = new Date(),
): ReportsData {
	const entries = normalizeEntries(rows);

	const firstEntry = entries.length ? entries[0]!.start : null;
	const lastEntry = entries.length ? entries[entries.length - 1]!.start : null;
	const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

	const today = startOfDay(now);
	const weekWindowStart = new Date(startOfWeek(now).getTime() - 25 * 7 * DAY_MS);
	const monthWindowStart = addMonths(startOfMonth(now), -11);
	const dayWindowStart = new Date(today.getTime() - 29 * DAY_MS);

	const weeklyAll = buildSeries(entries, "week", { to: now });
	const weekly = buildSeries(
		inRange(entries, weekWindowStart, new Date(today.getTime() + DAY_MS)),
		"week",
		{ from: weekWindowStart, to: now },
	);
	const monthly = buildSeries(
		inRange(entries, monthWindowStart, new Date(today.getTime() + DAY_MS)),
		"month",
		{ from: monthWindowStart, to: now },
	);
	const daily30 = buildSeries(
		inRange(entries, dayWindowStart, new Date(today.getTime() + DAY_MS)),
		"day",
		{ from: dayWindowStart, to: now },
	);

	const monthlyAll = buildSeries(entries, "month", { to: now });
	const dailyAll = buildSeries(entries, "day", { to: now });

	return {
		generatedAt: now,
		isEmpty: entries.length === 0,
		firstEntry,
		lastEntry,
		totalEntries: entries.length,

		weekly,
		weeklyAll,
		monthly,
		daily30,

		comparisons: buildComparisons(entries, now),
		averages: [
			buildWindowAverages(entries, now, 1, "Last 1 month", firstEntry),
			buildWindowAverages(entries, now, 3, "Last 3 months", firstEntry),
			buildWindowAverages(entries, now, 12, "Last 12 months", firstEntry),
		],
		projects: buildProjectReports(entries, now, totalHours),
		customers: buildCustomerReports(entries, now, totalHours),
		dayOfWeek: buildDayOfWeek(entries, firstEntry, now, totalHours),
		hourOfDay: buildHourOfDay(entries, totalHours),
		sessions: buildSessions(entries),
		streaks: buildStreaks(entries, now),
		records: {
			bestDay: pickRecord(dailyAll, "hours"),
			bestWeek: pickRecord(weeklyAll, "hours"),
			bestMonth: pickRecord(monthlyAll, "hours"),
			topEarningMonth: pickRecord(monthlyAll, "amount"),
		},
		billing: buildBilling(entries),
		forecast: buildForecast(entries, now),
	};
}
