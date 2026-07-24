// Paca - Reports view
//
// A tabbed analytics surface over the time-tracking data. Every number comes
// from `buildReports()` in src/reports.ts; this file is presentation only.

import type { ReactNode } from "react";
import { useTerminalDimensions } from "@opentui/react";
import type { Theme } from "../types.ts";
import {
	DOW_NAMES,
	formatClock,
	formatDelta,
	formatHours,
	formatMoney,
	formatMoneyExact,
	formatPercent,
	type ReportsData,
	type WindowValues,
} from "../reports.ts";
import {
	BarChart,
	HBarRow,
	SegmentBar,
	StatRow,
	StatTile,
	TimeSeriesChart,
	type BarColumn,
} from "./Charts.tsx";

export const REPORT_TABS = [
	"Overview",
	"Averages",
	"Trends",
	"Projects",
	"Clients",
	"Patterns",
	"Earnings",
] as const;

export const REPORT_TAB_COUNT = REPORT_TABS.length;

interface ReportsViewProps {
	data: ReportsData | null;
	loading: boolean;
	activeTab: number;
	theme: Theme;
	focused: boolean;
}

// ---------------------------------------------------------------------------
// Small layout helpers
// ---------------------------------------------------------------------------

function fit(text: string, width: number, align: "left" | "right" = "left") {
	const t = text.length > width ? `${text.slice(0, Math.max(1, width - 1))}…` : text;
	return align === "right" ? t.padStart(width, " ") : t.padEnd(width, " ");
}

interface Col {
	text: string;
	width: number;
	align?: "left" | "right";
	color?: string;
	bold?: boolean;
}

function Row({
	cols,
	theme,
	dim,
	gap = 1,
}: {
	cols: Col[];
	theme: Theme;
	dim?: boolean;
	gap?: number;
}) {
	const colors = theme.colors;
	return (
		<text>
			{cols.map((c, i) => (
				<span
					key={i}
					fg={c.color ?? (dim ? colors.textMuted : colors.textPrimary)}
					attributes={c.bold ? "bold" : undefined}
				>
					{fit(c.text, c.width, c.align) + (i < cols.length - 1 ? " ".repeat(gap) : "")}
				</span>
			))}
		</text>
	);
}

function Section({
	title,
	theme,
	children,
	hint,
}: {
	title: string;
	theme: Theme;
	children: ReactNode;
	hint?: string;
}) {
	const colors = theme.colors;
	return (
		<box style={{ flexDirection: "column", marginBottom: 1 }}>
			<text>
				<span fg={colors.accent} attributes="bold">
					{title}
				</span>
				{hint ? <span fg={colors.textMuted}>{`  ${hint}`}</span> : null}
			</text>
			<box
				style={{
					flexDirection: "column",
					border: ["left"],
					borderColor: colors.borderSubtle,
					paddingLeft: 1,
				}}
			>
				{children}
			</box>
		</box>
	);
}

/** The three rolling-window columns of an hours-per-week table. */
function weeklyAvgCols(
	avg: WindowValues,
	theme: Theme,
	bold: boolean,
): Col[] {
	const colors = theme.colors;
	return ([avg.d30, avg.d90, avg.d365] as const).map((v) => ({
		text: v > 0 ? `${formatHours(v)}/wk` : "—",
		width: 10,
		align: "right" as const,
		bold: bold && v > 0,
		color: v > 0 ? colors.textPrimary : colors.textMuted,
	}));
}

function deltaColor(delta: number | null, theme: Theme): string {
	if (delta === null || delta === 0) return theme.colors.textMuted;
	return delta > 0 ? theme.colors.success : theme.colors.error;
}

function dateLabel(d: Date | null): string {
	if (!d) return "—";
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function OverviewTab({
	data,
	theme,
	width,
}: {
	data: ReportsData;
	theme: Theme;
	width: number;
}) {
	const colors = theme.colors;
	const week = data.comparisons.find((c) => c.label === "This week")!;
	const month = data.comparisons.find((c) => c.label === "This month")!;
	const threeMonth = data.averages[1]!;
	const { billing, streaks, forecast } = data;

	// Workload by client over rolling windows. Clients keep their palette slot
	// from the Clients tab so colors line up across reports.
	const activeClients = data.customers
		.map((c, i) => ({ ...c, colorIndex: i }))
		.filter((c) => c.windowHours.d365 > 0)
		.sort((a, b) => {
			if (a.unassigned !== b.unassigned) return a.unassigned ? 1 : -1;
			return b.weeklyAvg.d365 - a.weeklyAvg.d365;
		});
	const idleClientCount = data.customers.length - activeClients.length;
	const workloadTotal = activeClients.reduce(
		(acc, c) => ({
			d30: acc.d30 + c.weeklyAvg.d30,
			d90: acc.d90 + c.weeklyAvg.d90,
			d365: acc.d365 + c.weeklyAvg.d365,
		}),
		{ d30: 0, d90: 0, d365: 0 },
	);

	return (
		<box style={{ flexDirection: "column" }}>
			<box style={{ flexDirection: "row", gap: 1, marginBottom: 1 }}>
				<StatTile
					label="This week"
					value={formatHours(week.current.hours)}
					sub={`${formatDelta(week.hoursDelta)} vs last week`}
					subColor={deltaColor(week.hoursDelta, theme)}
					theme={theme}
					accent={colors.borderOff}
				/>
				<StatTile
					label="This month"
					value={formatHours(month.current.hours)}
					sub={`${formatDelta(month.hoursDelta)} vs last month`}
					subColor={deltaColor(month.hoursDelta, theme)}
					theme={theme}
					accent={colors.borderOff}
				/>
				<StatTile
					label="Month earnings"
					value={formatMoney(month.current.amount)}
					sub={`proj. ${formatMoney(forecast.projectedAmount)}`}
					valueColor={colors.success}
					theme={theme}
					accent={colors.borderOff}
				/>
				<StatTile
					label="Unbilled"
					value={formatMoney(billing.uninvoicedAmount)}
					sub={`${formatHours(billing.uninvoicedHours)} not invoiced`}
					valueColor={
						billing.uninvoicedAmount > 0 ? colors.warning : colors.textPrimary
					}
					theme={theme}
					accent={colors.borderOff}
				/>
			</box>

			<box style={{ flexDirection: "row", gap: 1, marginBottom: 1 }}>
				<StatTile
					label="Avg / week (3mo)"
					value={formatHours(threeMonth.avgHoursPerWeek)}
					sub={`${formatMoney(threeMonth.avgAmountPerWeek)} / wk`}
					theme={theme}
					accent={colors.borderOff}
				/>
				<StatTile
					label="Avg / month (3mo)"
					value={formatHours(threeMonth.avgHoursPerMonth)}
					sub={`${formatMoney(threeMonth.avgAmountPerMonth)} / mo`}
					theme={theme}
					accent={colors.borderOff}
				/>
				<StatTile
					label="Effective rate"
					value={
						billing.avgRate > 0 ? `$${billing.avgRate.toFixed(0)}/h` : "—"
					}
					sub={`${formatPercent(billing.billableShare)} billable`}
					theme={theme}
					accent={colors.borderOff}
				/>
				<StatTile
					label="Streak"
					value={`${streaks.current} day${streaks.current === 1 ? "" : "s"}`}
					sub={`best ${streaks.longest} · ${formatPercent(streaks.coverage)} of days`}
					valueColor={streaks.current > 0 ? colors.success : colors.textPrimary}
					theme={theme}
					accent={colors.borderOff}
				/>
			</box>

			<Section title="Weekly hours" theme={theme} hint="last 26 weeks">
				<TimeSeriesChart
					data={data.weekly}
					width={width - 4}
					theme={theme}
					height={9}
					maxColumns={26}
				/>
			</Section>

			<Section title="Period comparison" theme={theme}>
				<Row
					theme={theme}
					dim
					cols={[
						{ text: "PERIOD", width: 14 },
						{ text: "HOURS", width: 9, align: "right" },
						{ text: "Δ", width: 7, align: "right" },
						{ text: "EARNED", width: 11, align: "right" },
						{ text: "Δ", width: 7, align: "right" },
						{ text: "DAYS", width: 6, align: "right" },
						{ text: "SESSIONS", width: 9, align: "right" },
					]}
				/>
				{data.comparisons.map((c) => (
					<Row
						key={c.label}
						theme={theme}
						cols={[
							{ text: c.label, width: 14, color: colors.textSecondary },
							{ text: formatHours(c.current.hours), width: 9, align: "right", bold: true },
							{
								text: formatDelta(c.hoursDelta),
								width: 7,
								align: "right",
								color: deltaColor(c.hoursDelta, theme),
							},
							{
								text: formatMoney(c.current.amount),
								width: 11,
								align: "right",
								color: colors.success,
							},
							{
								text: formatDelta(c.amountDelta),
								width: 7,
								align: "right",
								color: deltaColor(c.amountDelta, theme),
							},
							{ text: String(c.current.activeDays), width: 6, align: "right", color: colors.textSecondary },
							{ text: String(c.current.entries), width: 9, align: "right", color: colors.textSecondary },
						]}
					/>
				))}
			</Section>

			<Section
				title="Weekly workload by client"
				theme={theme}
				hint="average hours per week over rolling windows ending today"
			>
				<Row
					theme={theme}
					dim
					cols={[
						{ text: "CLIENT / PROJECT", width: 26 },
						{ text: "30 DAYS", width: 10, align: "right" },
						{ text: "90 DAYS", width: 10, align: "right" },
						{ text: "365 DAYS", width: 10, align: "right" },
						{ text: "TREND", width: 7, align: "right" },
					]}
				/>
				{activeClients.length === 0 ? (
					<text fg={colors.textSecondary}>
						Nothing tracked in the last year.
					</text>
				) : (
					<>
						{activeClients.map((c) => {
							const color = c.unassigned
								? colors.textMuted
								: theme.projectColors[c.colorIndex % theme.projectColors.length]!;
							// Is this client ramping up or winding down? Compare the most
							// recent month's pace against the last quarter's.
							const trend =
								c.weeklyAvg.d90 > 0
									? (c.weeklyAvg.d30 - c.weeklyAvg.d90) / c.weeklyAvg.d90
									: null;
							const visibleProjects = c.projects.filter(
								(p) => p.windowHours.d365 > 0,
							);
							return (
								<box key={c.customerId} style={{ flexDirection: "column" }}>
									<Row
										theme={theme}
										cols={[
											{ text: c.name, width: 26, color, bold: true },
											...weeklyAvgCols(c.weeklyAvg, theme, true),
											{
												text: formatDelta(trend),
												width: 7,
												align: "right",
												color: deltaColor(trend, theme),
											},
										]}
									/>
									{visibleProjects.length > 1 &&
										visibleProjects.map((p, pi) => (
											<Row
												key={p.projectId}
												theme={theme}
												cols={[
													{
														text: `${pi === visibleProjects.length - 1 ? "└" : "├"} ${p.name}`,
														width: 26,
														color: colors.textSecondary,
													},
													...weeklyAvgCols(p.weeklyAvg, theme, false),
													{ text: "", width: 7, align: "right" },
												]}
											/>
										))}
								</box>
							);
						})}
						<Row
							theme={theme}
							cols={[
								{ text: "All work", width: 26, color: colors.textSecondary, bold: true },
								...weeklyAvgCols(workloadTotal, theme, true),
								{ text: "", width: 7, align: "right" },
							]}
						/>
						{idleClientCount > 0 && (
							<text fg={colors.textMuted}>
								{`${idleClientCount} client${idleClientCount === 1 ? "" : "s"} with no time in the last 365 days hidden`}
							</text>
						)}
					</>
				)}
			</Section>

			<Section title="All time" theme={theme}>
				<StatRow
					label="Tracked"
					value={formatHours(billing.lifetimeHours)}
					theme={theme}
					hint={`${data.totalEntries} sessions since ${dateLabel(data.firstEntry)}`}
				/>
				<StatRow
					label="Earned"
					value={formatMoneyExact(billing.lifetimeEarnings)}
					theme={theme}
					valueColor={colors.success}
					hint={`${formatHours(billing.billableHours)} billable`}
				/>
				<StatRow
					label="Active days"
					value={`${streaks.activeDays} of ${streaks.spanDays}`}
					theme={theme}
					hint={formatPercent(streaks.coverage)}
				/>
			</Section>
		</box>
	);
}

function AveragesTab({
	data,
	theme,
	width,
}: {
	data: ReportsData;
	theme: Theme;
	width: number;
}) {
	const colors = theme.colors;
	const maxWeekAvg = data.averages.reduce(
		(m, a) => Math.max(m, a.avgHoursPerWeek),
		0,
	);
	const maxMonthAvg = data.averages.reduce(
		(m, a) => Math.max(m, a.avgHoursPerMonth),
		0,
	);
	const barWidth = Math.max(12, Math.min(30, width - 46));

	return (
		<box style={{ flexDirection: "column" }}>
			<Section
				title="Hour averages"
				theme={theme}
				hint="windows shrink to your first entry so early data isn't diluted"
			>
				<Row
					theme={theme}
					dim
					cols={[
						{ text: "WINDOW", width: 15 },
						{ text: "TOTAL", width: 9, align: "right" },
						{ text: "AVG/WK", width: 9, align: "right" },
						{ text: "AVG/MO", width: 9, align: "right" },
						{ text: "AVG/DAY", width: 9, align: "right" },
						{ text: "PER ACTIVE", width: 11, align: "right" },
						{ text: "ACTIVE", width: 8, align: "right" },
					]}
				/>
				{data.averages.map((a) => (
					<Row
						key={a.label}
						theme={theme}
						cols={[
							{
								text: a.partial ? `${a.label}*` : a.label,
								width: 15,
								color: colors.textSecondary,
							},
							{ text: formatHours(a.totalHours), width: 9, align: "right", bold: true },
							{ text: formatHours(a.avgHoursPerWeek), width: 9, align: "right", color: colors.accent },
							{ text: formatHours(a.avgHoursPerMonth), width: 9, align: "right", color: colors.accent },
							{ text: formatHours(a.avgHoursPerCalendarDay), width: 9, align: "right", color: colors.textSecondary },
							{ text: formatHours(a.avgHoursPerActiveDay), width: 11, align: "right", color: colors.textSecondary },
							{ text: `${a.activeDays}d`, width: 8, align: "right", color: colors.textMuted },
						]}
					/>
				))}
				{data.averages.some((a) => a.partial) && (
					<text fg={colors.textMuted}>
						* window is shorter than requested — not enough history
					</text>
				)}
			</Section>

			<Section title="Earning averages" theme={theme}>
				<Row
					theme={theme}
					dim
					cols={[
						{ text: "WINDOW", width: 15 },
						{ text: "TOTAL", width: 11, align: "right" },
						{ text: "AVG/WK", width: 11, align: "right" },
						{ text: "AVG/MO", width: 11, align: "right" },
						{ text: "PER ACTIVE", width: 11, align: "right" },
						{ text: "RATE", width: 9, align: "right" },
					]}
				/>
				{data.averages.map((a) => (
					<Row
						key={a.label}
						theme={theme}
						cols={[
							{ text: a.label, width: 15, color: colors.textSecondary },
							{ text: formatMoney(a.totalAmount), width: 11, align: "right", bold: true, color: colors.success },
							{ text: formatMoney(a.avgAmountPerWeek), width: 11, align: "right", color: colors.success },
							{ text: formatMoney(a.avgAmountPerMonth), width: 11, align: "right", color: colors.success },
							{ text: formatMoney(a.avgAmountPerActiveDay), width: 11, align: "right", color: colors.textSecondary },
							{
								text: a.effectiveRate > 0 ? `$${a.effectiveRate.toFixed(0)}/h` : "—",
								width: 9,
								align: "right",
								color: colors.textSecondary,
							},
						]}
					/>
				))}
			</Section>

			<Section title="Weekly pace" theme={theme} hint="average hours per week">
				{data.averages.map((a, i) => (
					<HBarRow
						key={a.label}
						label={a.label}
						value={a.avgHoursPerWeek}
						max={maxWeekAvg}
						color={theme.projectColors[i % theme.projectColors.length]!}
						theme={theme}
						barWidth={barWidth}
						labelWidth={15}
						valueText={formatHours(a.avgHoursPerWeek)}
						suffix={`peak ${Math.round(a.busiestWeekHours)}h`}
					/>
				))}
			</Section>

			<Section title="Monthly pace" theme={theme} hint="average hours per month">
				{data.averages.map((a, i) => (
					<HBarRow
						key={a.label}
						label={a.label}
						value={a.avgHoursPerMonth}
						max={maxMonthAvg}
						color={theme.projectColors[i % theme.projectColors.length]!}
						theme={theme}
						barWidth={barWidth}
						labelWidth={15}
						valueText={formatHours(a.avgHoursPerMonth)}
						suffix={formatMoney(a.avgAmountPerMonth)}
					/>
				))}
			</Section>
		</box>
	);
}

function TrendsTab({
	data,
	theme,
	width,
}: {
	data: ReportsData;
	theme: Theme;
	width: number;
}) {
	const colors = theme.colors;
	const months = data.monthly;

	return (
		<box style={{ flexDirection: "column" }}>
			<Section title="Monthly hours" theme={theme} hint="last 12 months">
				<TimeSeriesChart
					data={months}
					width={width - 4}
					theme={theme}
					height={10}
					maxColumns={12}
					minBarWidth={3}
					maxBarWidth={8}
				/>
			</Section>

			<Section title="Month by month" theme={theme}>
				<Row
					theme={theme}
					dim
					cols={[
						{ text: "MONTH", width: 10 },
						{ text: "HOURS", width: 9, align: "right" },
						{ text: "Δ", width: 7, align: "right" },
						{ text: "EARNED", width: 11, align: "right" },
						{ text: "DAYS", width: 6, align: "right" },
						{ text: "AVG/DAY", width: 9, align: "right" },
						{ text: "SESSIONS", width: 9, align: "right" },
					]}
				/>
				{months
					.slice()
					.reverse()
					.map((m, i, arr) => {
						const prev = arr[i + 1];
						const delta =
							prev && prev.hours > 0 ? (m.hours - prev.hours) / prev.hours : null;
						return (
							<Row
								key={m.key}
								theme={theme}
								cols={[
									{ text: m.labelLong, width: 10, color: colors.textSecondary },
									{ text: formatHours(m.hours), width: 9, align: "right", bold: true },
									{
										text: formatDelta(delta),
										width: 7,
										align: "right",
										color: deltaColor(delta, theme),
									},
									{ text: formatMoney(m.amount), width: 11, align: "right", color: colors.success },
									{
										text: m.activeDays > 0 ? String(m.activeDays) : "—",
										width: 6,
										align: "right",
										color: colors.textMuted,
									},
									{
										text:
											m.activeDays > 0 ? formatHours(m.hours / m.activeDays) : "—",
										width: 9,
										align: "right",
										color: colors.textSecondary,
									},
									{ text: String(m.entryCount), width: 9, align: "right", color: colors.textMuted },
								]}
							/>
						);
					})}
			</Section>

			<Section title="Last 30 days" theme={theme} hint="daily hours">
				<TimeSeriesChart
					data={data.daily30}
					width={width - 4}
					theme={theme}
					height={8}
					maxColumns={30}
					minBarWidth={2}
					maxBarWidth={4}
					showLegend={false}
					emptyMessage="Nothing tracked in the last 30 days"
				/>
			</Section>

			<Section title="Weekly hours" theme={theme} hint="last 26 weeks">
				<TimeSeriesChart
					data={data.weekly}
					width={width - 4}
					theme={theme}
					height={9}
					maxColumns={26}
				/>
			</Section>
		</box>
	);
}

function ProjectsTab({
	data,
	theme,
	width,
}: {
	data: ReportsData;
	theme: Theme;
	width: number;
}) {
	const colors = theme.colors;
	const maxHours = data.projects.reduce((m, p) => Math.max(m, p.hours), 0);
	const barWidth = Math.max(12, Math.min(30, width - 50));

	if (data.projects.length === 0) {
		return <text fg={colors.textSecondary}>No tracked projects yet.</text>;
	}

	return (
		<box style={{ flexDirection: "column" }}>
			<Section title="Time split" theme={theme} hint="all time">
				{data.projects.slice(0, 12).map((p, i) => (
					<HBarRow
						key={p.projectId}
						label={p.name}
						value={p.hours}
						max={maxHours}
						color={theme.projectColors[i % theme.projectColors.length]!}
						theme={theme}
						barWidth={barWidth}
						labelWidth={18}
						valueText={formatHours(p.hours)}
						suffix={formatPercent(p.share)}
					/>
				))}
			</Section>

			<Section title="Project detail" theme={theme}>
				<Row
					theme={theme}
					dim
					cols={[
						{ text: "PROJECT", width: 18 },
						{ text: "HOURS", width: 9, align: "right" },
						{ text: "SHARE", width: 7, align: "right" },
						{ text: "RATE", width: 8, align: "right" },
						{ text: "EARNED", width: 11, align: "right" },
						{ text: "SESS", width: 6, align: "right" },
						{ text: "AVG", width: 7, align: "right" },
						{ text: "30D", width: 8, align: "right" },
						{ text: "LAST", width: 13, align: "right" },
					]}
				/>
				{data.projects.map((p, i) => (
					<Row
						key={p.projectId}
						theme={theme}
						cols={[
							{
								text: p.name,
								width: 18,
								color: theme.projectColors[i % theme.projectColors.length]!,
							},
							{ text: formatHours(p.hours), width: 9, align: "right", bold: true },
							{ text: formatPercent(p.share), width: 7, align: "right", color: colors.textSecondary },
							{
								text: p.rate ? `$${p.rate.toFixed(0)}` : "—",
								width: 8,
								align: "right",
								color: p.rate ? colors.textSecondary : colors.textMuted,
							},
							{ text: formatMoney(p.amount), width: 11, align: "right", color: colors.success },
							{ text: String(p.entries), width: 6, align: "right", color: colors.textMuted },
							{ text: formatHours(p.avgSessionHours), width: 7, align: "right", color: colors.textMuted },
							{
								text: p.last30Hours > 0 ? formatHours(p.last30Hours) : "—",
								width: 8,
								align: "right",
								color: p.last30Hours > 0 ? colors.accent : colors.textMuted,
							},
							{ text: dateLabel(p.lastEntry), width: 13, align: "right", color: colors.textMuted },
						]}
					/>
				))}
			</Section>

			<Section title="Where the money comes from" theme={theme}>
				<SegmentBar
					width={Math.max(20, width - 6)}
					theme={theme}
					segments={data.projects.map((p, i) => ({
						value: p.amount,
						color: theme.projectColors[i % theme.projectColors.length]!,
					}))}
				/>
				<box style={{ flexDirection: "row", gap: 2, flexWrap: "wrap", marginTop: 1 }}>
					{data.projects
						.map((p, i) => ({ ...p, colorIndex: i }))
						.filter((p) => p.amount > 0)
						.slice(0, 6)
						.map((p) => (
							<text key={p.projectId}>
								<span
									fg={
										theme.projectColors[p.colorIndex % theme.projectColors.length]!
									}
								>
									●
								</span>
								<span fg={colors.textSecondary}>{` ${p.name.slice(0, 14)} `}</span>
								<span fg={colors.textPrimary}>{formatMoney(p.amount)}</span>
							</text>
						))}
				</box>
			</Section>
		</box>
	);
}

function ClientsTab({
	data,
	theme,
	width,
}: {
	data: ReportsData;
	theme: Theme;
	width: number;
}) {
	const colors = theme.colors;
	const clients = data.customers.filter((c) => !c.unassigned);
	const unassigned = data.customers.find((c) => c.unassigned) ?? null;
	const maxAmount = clients.reduce((m, c) => Math.max(m, c.amount), 0);
	const maxHours = data.customers.reduce((m, c) => Math.max(m, c.hours), 0);
	const barWidth = Math.max(12, Math.min(30, width - 50));

	if (data.customers.length === 0) {
		return <text fg={colors.textSecondary}>No client activity yet.</text>;
	}

	// Color clients by their position in the full list so bars, tables and the
	// project sub-rows all agree.
	const colorAt = (i: number) =>
		theme.projectColors[i % theme.projectColors.length]!;

	return (
		<box style={{ flexDirection: "column" }}>
			<Section title="Revenue by client" theme={theme} hint="all time">
				{clients.length === 0 ? (
					<text fg={colors.textSecondary}>
						No projects are linked to a customer yet.
					</text>
				) : (
					clients.slice(0, 12).map((c, i) => (
						<HBarRow
							key={c.customerId}
							label={c.name}
							value={c.amount}
							max={maxAmount}
							color={colorAt(i)}
							theme={theme}
							barWidth={barWidth}
							labelWidth={18}
							valueText={formatMoney(c.amount)}
							suffix={formatHours(c.hours)}
						/>
					))
				)}
			</Section>

			<Section title="Hours by client" theme={theme} hint="includes unlinked work">
				{data.customers.slice(0, 12).map((c, i) => (
					<HBarRow
						key={c.customerId}
						label={c.name}
						value={c.hours}
						max={maxHours}
						color={c.unassigned ? colors.borderOff : colorAt(i)}
						theme={theme}
						barWidth={barWidth}
						labelWidth={18}
						valueText={formatHours(c.hours)}
						suffix={formatPercent(c.share)}
					/>
				))}
			</Section>

			<Section
				title="Client detail"
				theme={theme}
				hint="projects rolling up to each client"
			>
				<Row
					theme={theme}
					dim
					cols={[
						{ text: "CLIENT / PROJECT", width: 26 },
						{ text: "HOURS", width: 9, align: "right" },
						{ text: "SHARE/RATE", width: 10, align: "right" },
						{ text: "REVENUE", width: 11, align: "right" },
						{ text: "INVOICED", width: 11, align: "right" },
						{ text: "UNBILLED", width: 11, align: "right" },
						{ text: "LAST", width: 13, align: "right" },
					]}
				/>
				{data.customers.map((c, i) => {
					const color = c.unassigned ? colors.textMuted : colorAt(i);
					return (
						<box key={c.customerId} style={{ flexDirection: "column" }}>
							<Row
								theme={theme}
								cols={[
									{ text: c.name, width: 26, color, bold: true },
									{ text: formatHours(c.hours), width: 9, align: "right", bold: true },
									{ text: formatPercent(c.share), width: 10, align: "right", color: colors.textSecondary },
									{ text: formatMoney(c.amount), width: 11, align: "right", color: colors.success },
									{ text: formatMoney(c.invoicedAmount), width: 11, align: "right", color: colors.textSecondary },
									{
										text: formatMoney(c.uninvoicedAmount),
										width: 11,
										align: "right",
										color: c.uninvoicedAmount > 0 ? colors.warning : colors.textMuted,
									},
									{ text: dateLabel(c.lastEntry), width: 13, align: "right", color: colors.textMuted },
								]}
							/>
							{c.projects.map((p, pi) => (
								<Row
									key={p.projectId}
									theme={theme}
									cols={[
										{
											text: `${pi === c.projects.length - 1 ? "└" : "├"} ${p.name}`,
											width: 26,
											color: colors.textSecondary,
										},
										{ text: formatHours(p.hours), width: 9, align: "right", color: colors.textSecondary },
										{
											text: p.rate ? `$${p.rate.toFixed(0)}/h` : "no rate",
											width: 10,
											align: "right",
											color: p.rate ? colors.textMuted : colors.warning,
										},
										{ text: formatMoney(p.amount), width: 11, align: "right", color: colors.textMuted },
										{ text: "", width: 11, align: "right" },
										{ text: "", width: 11, align: "right" },
										{ text: dateLabel(p.lastEntry), width: 13, align: "right", color: colors.textMuted },
									]}
								/>
							))}
						</box>
					);
				})}
			</Section>

			{unassigned && (
				<Section
					title="Not linked to a client"
					theme={theme}
					hint={`${formatHours(unassigned.hours)} · ${formatPercent(unassigned.share)} of all tracked time`}
				>
					<text fg={colors.textSecondary}>
						These projects have no customer set, so they never reach a client
						report or an invoice. Assign one from the Projects panel.
					</text>
					{unassigned.projects.map((p) => (
						<HBarRow
							key={p.projectId}
							label={p.name}
							value={p.hours}
							max={unassigned.projects[0]?.hours ?? p.hours}
							color={p.rate ? colors.warning : colors.borderOff}
							theme={theme}
							barWidth={barWidth}
							labelWidth={18}
							valueText={formatHours(p.hours)}
							suffix={p.rate ? `$${p.rate.toFixed(0)}/h` : "no rate"}
						/>
					))}
				</Section>
			)}
		</box>
	);
}

function PatternsTab({
	data,
	theme,
	width,
}: {
	data: ReportsData;
	theme: Theme;
	width: number;
}) {
	const colors = theme.colors;
	const { sessions, streaks, records } = data;
	const maxDow = data.dayOfWeek.reduce((m, d) => Math.max(m, d.avgHours), 0);
	const barWidth = Math.max(12, Math.min(34, width - 44));

	const peakHour = data.hourOfDay.reduce(
		(best, h) => (h.hours > best.hours ? h : best),
		data.hourOfDay[0] ?? { hour: 0, hours: 0, share: 0 },
	);

	const hourColumns: BarColumn[] = data.hourOfDay.map((h) => ({
		label:
			h.hour % 3 === 0
				? h.hour === 0
					? "12a"
					: h.hour === 12
						? "12p"
						: h.hour < 12
							? `${h.hour}a`
							: `${h.hour - 12}p`
				: "",
		value: h.hours,
		segments: [
			{
				value: h.hours,
				color: h.hour === peakHour.hour ? colors.accentSecondary : colors.accent,
			},
		],
	}));

	return (
		<box style={{ flexDirection: "column" }}>
			<Section title="Day of week" theme={theme} hint="average hours per that weekday">
				{data.dayOfWeek.map((d) => (
					<HBarRow
						key={d.day}
						label={DOW_NAMES[d.day] ?? d.name}
						value={d.avgHours}
						max={maxDow}
						color={
							d.day === 0 || d.day === 6 ? colors.accentSecondary : colors.accent
						}
						theme={theme}
						barWidth={barWidth}
						labelWidth={5}
						valueText={formatHours(d.avgHours)}
						suffix={formatPercent(d.share)}
					/>
				))}
			</Section>

			<Section
				title="Time of day"
				theme={theme}
				hint={`peak hour: ${peakHour.hour}:00`}
			>
				<BarChart
					columns={hourColumns}
					width={width - 6}
					theme={theme}
					height={7}
					minBarWidth={2}
					maxBarWidth={4}
					maxColumns={24}
					showValueLabels={false}
					emptyMessage="No sessions recorded"
				/>
			</Section>

			<box style={{ flexDirection: "row", gap: 1 }}>
				<box style={{ flexDirection: "column", flexGrow: 1 }}>
					<Section title="Sessions" theme={theme}>
						<StatRow label="Total sessions" value={String(sessions.count)} theme={theme} labelWidth={18} />
						<StatRow label="Average length" value={formatClock(sessions.avgMs)} theme={theme} labelWidth={18} />
						<StatRow label="Median length" value={formatClock(sessions.medianMs)} theme={theme} labelWidth={18} />
						<StatRow
							label="Longest"
							value={formatClock(sessions.longestMs)}
							theme={theme}
							labelWidth={18}
							hint={sessions.longestLabel}
						/>
						<StatRow
							label="Per active day"
							value={sessions.avgPerActiveDay.toFixed(1)}
							theme={theme}
							labelWidth={18}
						/>
						<StatRow
							label="Under 15m"
							value={String(sessions.under15mCount)}
							theme={theme}
							labelWidth={18}
							valueColor={colors.textSecondary}
						/>
						<StatRow
							label="Deep (4h+)"
							value={String(sessions.over4hCount)}
							theme={theme}
							labelWidth={18}
							valueColor={colors.success}
						/>
					</Section>
				</box>

				<box style={{ flexDirection: "column", flexGrow: 1 }}>
					<Section title="Consistency" theme={theme}>
						<StatRow
							label="Current streak"
							value={`${streaks.current} day${streaks.current === 1 ? "" : "s"}`}
							theme={theme}
							labelWidth={18}
							valueColor={streaks.current > 0 ? colors.success : colors.textMuted}
							hint={streaks.trackedToday ? "tracked today" : "nothing today yet"}
						/>
						<StatRow
							label="Longest streak"
							value={`${streaks.longest} days`}
							theme={theme}
							labelWidth={18}
							hint={`ended ${streaks.longestEndLabel}`}
						/>
						<StatRow
							label="Active days"
							value={`${streaks.activeDays} / ${streaks.spanDays}`}
							theme={theme}
							labelWidth={18}
							hint={formatPercent(streaks.coverage)}
						/>
						<StatRow
							label="First tracked"
							value={dateLabel(streaks.firstDay)}
							theme={theme}
							labelWidth={18}
						/>
						<StatRow
							label="Last tracked"
							value={dateLabel(streaks.lastDay)}
							theme={theme}
							labelWidth={18}
						/>
					</Section>
				</box>
			</box>

			<Section title="Personal records" theme={theme}>
				{(
					[
						["Best day", records.bestDay],
						["Best week", records.bestWeek],
						["Best month", records.bestMonth],
						["Top earning month", records.topEarningMonth],
					] as const
				).map(([label, rec]) => (
					<StatRow
						key={label}
						label={label}
						value={rec ? formatHours(rec.hours) : "—"}
						theme={theme}
						labelWidth={20}
						hint={rec ? `${rec.label} · ${formatMoney(rec.amount)}` : undefined}
					/>
				))}
			</Section>
		</box>
	);
}

function EarningsTab({
	data,
	theme,
	width,
}: {
	data: ReportsData;
	theme: Theme;
	width: number;
}) {
	const colors = theme.colors;
	const { billing, forecast } = data;
	const barWidth = Math.max(20, width - 6);
	const topEarners = [...data.projects]
		.filter((p) => p.amount > 0)
		.sort((a, b) => b.amount - a.amount);
	const maxEarn = topEarners.reduce((m, p) => Math.max(m, p.amount), 0);
	const hbarWidth = Math.max(12, Math.min(30, width - 50));

	return (
		<box style={{ flexDirection: "column" }}>
			<box style={{ flexDirection: "row", gap: 1, marginBottom: 1 }}>
				<StatTile
					label="Lifetime earned"
					value={formatMoney(billing.lifetimeEarnings)}
					sub={`${formatHours(billing.lifetimeHours)} tracked`}
					valueColor={colors.success}
					theme={theme}
					accent={colors.borderOff}
				/>
				<StatTile
					label="Invoiced"
					value={formatMoney(billing.invoicedAmount)}
					sub={`${formatHours(billing.invoicedHours)}`}
					theme={theme}
					accent={colors.borderOff}
				/>
				<StatTile
					label="Awaiting invoice"
					value={formatMoney(billing.uninvoicedAmount)}
					sub={`${formatHours(billing.uninvoicedHours)}`}
					valueColor={
						billing.uninvoicedAmount > 0 ? colors.warning : colors.textPrimary
					}
					theme={theme}
					accent={colors.borderOff}
				/>
				<StatTile
					label="Avg rate"
					value={billing.avgRate > 0 ? `$${billing.avgRate.toFixed(0)}/h` : "—"}
					sub={
						billing.highestRate !== null
							? `range $${billing.lowestRate}–$${billing.highestRate}`
							: "no rates set"
					}
					theme={theme}
					accent={colors.borderOff}
				/>
			</box>

			<Section title="Billable mix" theme={theme}>
				<SegmentBar
					width={barWidth}
					theme={theme}
					segments={[
						{ value: billing.invoicedHours, color: colors.success },
						{ value: billing.uninvoicedHours, color: colors.warning },
						{ value: billing.unratedHours, color: colors.borderOff },
					]}
				/>
				<box style={{ flexDirection: "row", gap: 3, marginTop: 1 }}>
					<text>
						<span fg={colors.success}>●</span>
						<span fg={colors.textSecondary}> Invoiced </span>
						<span fg={colors.textPrimary}>{formatHours(billing.invoicedHours)}</span>
					</text>
					<text>
						<span fg={colors.warning}>●</span>
						<span fg={colors.textSecondary}> Unbilled </span>
						<span fg={colors.textPrimary}>{formatHours(billing.uninvoicedHours)}</span>
					</text>
					<text>
						<span fg={colors.borderOff}>●</span>
						<span fg={colors.textSecondary}> No rate </span>
						<span fg={colors.textPrimary}>{formatHours(billing.unratedHours)}</span>
					</text>
				</box>
			</Section>

			<Section title="Monthly earnings" theme={theme} hint="last 12 months">
				<TimeSeriesChart
					data={data.monthly}
					width={width - 4}
					theme={theme}
					height={10}
					metric="amount"
					maxColumns={12}
					minBarWidth={3}
					maxBarWidth={8}
					emptyMessage="No billable time yet"
				/>
			</Section>

			<Section title="This month's pace" theme={theme}>
				<StatRow
					label="Tracked so far"
					value={formatHours(forecast.monthHours)}
					theme={theme}
					labelWidth={22}
					hint={`day ${forecast.daysElapsed} of ${forecast.daysInMonth}`}
				/>
				<StatRow
					label="Earned so far"
					value={formatMoneyExact(forecast.monthAmount)}
					theme={theme}
					labelWidth={22}
					valueColor={colors.success}
				/>
				<StatRow
					label="Projected hours"
					value={formatHours(forecast.projectedHours)}
					theme={theme}
					labelWidth={22}
					hint={`${formatDelta(forecast.paceVsLastMonth)} vs last month`}
				/>
				<StatRow
					label="Projected earnings"
					value={formatMoney(forecast.projectedAmount)}
					theme={theme}
					labelWidth={22}
					valueColor={colors.success}
				/>
				<StatRow
					label="Annual run rate"
					value={formatMoney(forecast.runRateAnnualAmount)}
					theme={theme}
					labelWidth={22}
					valueColor={colors.textSecondary}
				/>
			</Section>

			<Section title="Top earners" theme={theme}>
				{topEarners.length === 0 ? (
					<text fg={colors.textSecondary}>
						No hourly rates set — add one to a project to see earnings.
					</text>
				) : (
					topEarners.slice(0, 10).map((p, i) => (
						<HBarRow
							key={p.projectId}
							label={p.name}
							value={p.amount}
							max={maxEarn}
							color={theme.projectColors[i % theme.projectColors.length]!}
							theme={theme}
							barWidth={hbarWidth}
							labelWidth={18}
							valueText={formatMoney(p.amount)}
							suffix={p.rate ? `$${p.rate.toFixed(0)}/h` : "—"}
						/>
					))
				)}
			</Section>
		</box>
	);
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function ReportsView({
	data,
	loading,
	activeTab,
	theme,
	focused,
}: ReportsViewProps) {
	const colors = theme.colors;
	const { width: termWidth } = useTerminalDimensions();
	const contentWidth = Math.max(40, termWidth - 4);

	const tabBar = (
		<box
			style={{
				flexDirection: "row",
				gap: 1,
				marginBottom: 1,
			}}
		>
			{REPORT_TABS.map((tab, i) => {
				const active = i === activeTab;
				return (
					<text key={tab}>
						<span
							fg={active ? colors.bg : colors.textSecondary}
							bg={active ? colors.accent : undefined}
							attributes={active ? "bold" : undefined}
						>
							{` ${tab} `}
						</span>
					</text>
				);
			})}
			<text fg={colors.textMuted}>{"  ←/→ switch  ⇅ scroll"}</text>
		</box>
	);

	let body: ReactNode;
	if (loading && !data) {
		body = <text fg={colors.textSecondary}>Crunching numbers…</text>;
	} else if (!data || data.isEmpty) {
		body = (
			<box style={{ flexDirection: "column", gap: 1 }}>
				<text fg={colors.textSecondary}>No time tracked yet.</text>
				<text fg={colors.textMuted}>
					Press 't' to start a timer — reports appear once you have entries.
				</text>
			</box>
		);
	} else {
		switch (activeTab) {
			case 1:
				body = <AveragesTab data={data} theme={theme} width={contentWidth} />;
				break;
			case 2:
				body = <TrendsTab data={data} theme={theme} width={contentWidth} />;
				break;
			case 3:
				body = <ProjectsTab data={data} theme={theme} width={contentWidth} />;
				break;
			case 4:
				body = <ClientsTab data={data} theme={theme} width={contentWidth} />;
				break;
			case 5:
				body = <PatternsTab data={data} theme={theme} width={contentWidth} />;
				break;
			case 6:
				body = <EarningsTab data={data} theme={theme} width={contentWidth} />;
				break;
			default:
				body = <OverviewTab data={data} theme={theme} width={contentWidth} />;
		}
	}

	return (
		<box
			style={{
				flexDirection: "column",
				flexGrow: 1,
				paddingLeft: 2,
				paddingRight: 2,
				paddingTop: 1,
			}}
		>
			{tabBar}
			<scrollbox focused={focused} style={{ flexGrow: 1 }}>
				{body}
			</scrollbox>
		</box>
	);
}
