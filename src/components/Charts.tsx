// Paca - Reusable terminal chart primitives
//
// Shared by the Dashboard and the Reports view so both render identically.

import type { ReactNode } from "react";
import type { Theme } from "../types.ts";
import {
	formatHours,
	formatMoney,
	type TimeSeriesPoint,
} from "../reports.ts";

// Vertical eighth blocks — index === how many eighths of the cell are filled.
const V_EIGHTHS = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
// Horizontal eighth blocks for left-to-right bars.
const H_EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];
// Sparkline glyphs (no blank — a sparkline always draws a floor).
const SPARK = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

export interface BarSegment {
	value: number;
	color: string;
}

export interface BarColumn {
	label: string;
	value: number;
	valueLabel?: string;
	segments: BarSegment[];
}

interface BarChartProps {
	columns: BarColumn[];
	width: number;
	theme: Theme;
	/** Total rows of the plot area. The top row is reserved for value labels. */
	height?: number;
	minBarWidth?: number;
	maxBarWidth?: number;
	maxColumns?: number;
	emptyMessage?: string;
	showValueLabels?: boolean;
	defaultColor?: string;
}

/**
 * Render a label row where labels may be wider than their column. Labels are
 * centered on their bar and dropped when they would collide with the previous
 * one, which keeps a dense x-axis readable.
 */
function buildLabelRow(
	labels: string[],
	barWidth: number,
	gap: number,
	color: string,
	key: string,
): ReactNode {
	const totalWidth = labels.length * barWidth + (labels.length - 1) * gap;
	const chars: string[] = new Array(totalWidth).fill(" ");

	let lastEnd = -2;
	for (let i = 0; i < labels.length; i++) {
		const label = labels[i];
		if (!label) continue;

		const barStart = i * (barWidth + gap);
		const barCenter = barStart + Math.floor(barWidth / 2);
		const labelStart = Math.max(0, barCenter - Math.floor(label.length / 2));
		const labelEnd = labelStart + label.length;

		if (labelStart > lastEnd && labelEnd <= totalWidth) {
			for (let j = 0; j < label.length; j++) {
				chars[labelStart + j] = label[j]!;
			}
			lastEnd = labelEnd;
		}
	}

	return (
		<text key={key} fg={color}>
			{chars.join("")}
		</text>
	);
}

export function BarChart({
	columns,
	width,
	theme,
	height = 8,
	minBarWidth = 2,
	maxBarWidth = 10,
	maxColumns = 40,
	emptyMessage = "No data yet",
	showValueLabels = true,
	defaultColor,
}: BarChartProps) {
	const colors = theme.colors;
	const gap = 1;
	const availableWidth = Math.max(width, 16);

	const fitCount = Math.max(
		1,
		Math.floor((availableWidth + gap) / (minBarWidth + gap)),
	);
	const visible = columns.slice(
		-Math.min(columns.length, maxColumns, fitCount),
	);

	if (visible.length === 0) {
		return <text fg={colors.textSecondary}>{emptyMessage}</text>;
	}

	const barWidth = Math.min(
		maxBarWidth,
		Math.max(
			minBarWidth,
			Math.floor((availableWidth - (visible.length - 1) * gap) / visible.length),
		),
	);

	// When value labels are on, the top row of the plot area is kept free so the
	// tallest bar's label has somewhere to sit instead of overwriting the bar.
	const barRows = showValueLabels ? Math.max(1, height - 1) : height;
	const maxValue = visible.reduce((max, c) => Math.max(max, c.value), 0);
	const fallbackColor = defaultColor ?? theme.projectColors[0] ?? colors.accent;

	const built = visible.map((col) => {
		const eighths =
			maxValue > 0 && col.value > 0
				? Math.max(1, Math.round((col.value / maxValue) * barRows * 8))
				: 0;

		// Cumulative segment boundaries, expressed in eighths of a cell.
		const segTotal = col.segments.reduce((sum, s) => sum + s.value, 0);
		const bounds: { end: number; color: string }[] = [];
		let acc = 0;
		for (const seg of col.segments) {
			acc += seg.value;
			bounds.push({
				end: segTotal > 0 ? (acc / segTotal) * eighths : eighths,
				color: seg.color,
			});
		}
		if (bounds.length === 0) bounds.push({ end: eighths, color: fallbackColor });

		const cells: ({ char: string; color: string } | null)[] = [];
		for (let row = 0; row < barRows; row++) {
			const bottom = row * 8;
			const fill = Math.min(Math.max(eighths - bottom, 0), 8);
			if (fill <= 0) {
				cells.push(null);
				continue;
			}
			const mid = bottom + fill / 2;
			let color = bounds[bounds.length - 1]!.color;
			for (const b of bounds) {
				if (mid <= b.end) {
					color = b.color;
					break;
				}
			}
			cells.push({ char: V_EIGHTHS[fill]!, color });
		}

		return {
			cells,
			labelRow: Math.ceil(eighths / 8),
			valueLabel: col.value > 0 ? (col.valueLabel ?? "") : "",
		};
	});

	const rows: ReactNode[] = [];

	for (let row = height - 1; row >= 0; row--) {
		const parts: ReactNode[] = [];
		for (let i = 0; i < built.length; i++) {
			const isLast = i === built.length - 1;
			const slot = isLast ? barWidth : barWidth + gap;
			const entry = built[i]!;
			const label = entry.valueLabel;
			const labelFits = label.length <= slot - (isLast ? 0 : 1);

			if (showValueLabels && row === entry.labelRow && label && labelFits) {
				const padLeft = Math.floor((slot - label.length) / 2);
				const centered =
					" ".repeat(padLeft) +
					label +
					" ".repeat(Math.max(0, slot - padLeft - label.length));
				parts.push(
					<span key={i} fg={colors.textSecondary}>
						{centered}
					</span>,
				);
				continue;
			}

			const cell = entry.cells[row] ?? null;
			if (cell) {
				parts.push(
					<span key={i} fg={cell.color}>
						{cell.char.repeat(barWidth)}
					</span>,
				);
			} else {
				parts.push(<span key={i}>{" ".repeat(barWidth)}</span>);
			}
			if (!isLast) parts.push(<span key={`g${i}`}>{" ".repeat(gap)}</span>);
		}
		rows.push(<text key={`r${row}`}>{parts}</text>);
	}

	// Baseline
	const baseline: ReactNode[] = [];
	for (let i = 0; i < visible.length; i++) {
		baseline.push(
			<span key={i} fg={colors.borderSubtle}>
				{"─".repeat(barWidth)}
			</span>,
		);
		if (i < visible.length - 1) {
			baseline.push(
				<span key={`g${i}`} fg={colors.borderSubtle}>
					{"─".repeat(gap)}
				</span>,
			);
		}
	}
	rows.push(<text key="baseline">{baseline}</text>);

	rows.push(
		buildLabelRow(
			visible.map((c) => c.label),
			barWidth,
			gap,
			colors.textSecondary,
			"xaxis",
		),
	);

	return <box style={{ flexDirection: "column", width: "100%" }}>{rows}</box>;
}

// ---------------------------------------------------------------------------
// Time series chart (project-stacked) — used by Dashboard + Reports
// ---------------------------------------------------------------------------

interface TimeSeriesChartProps {
	data: TimeSeriesPoint[];
	width: number;
	theme: Theme;
	height?: number;
	metric?: "hours" | "amount";
	showLegend?: boolean;
	showTotal?: boolean;
	maxColumns?: number;
	minBarWidth?: number;
	maxBarWidth?: number;
	emptyMessage?: string;
}

export function TimeSeriesChart({
	data,
	width,
	theme,
	height = 8,
	metric = "hours",
	showLegend = true,
	showTotal = true,
	maxColumns = 40,
	minBarWidth = 2,
	maxBarWidth = 10,
	emptyMessage = "No time entries in this period",
}: TimeSeriesChartProps) {
	const colors = theme.colors;
	const palette = theme.projectColors;

	// Rank projects by total time so colors stay stable across every chart.
	const totals = new Map<string, { name: string; value: number }>();
	for (const point of data) {
		for (const p of point.projects) {
			const value = metric === "amount" ? p.amount : p.ms;
			const existing = totals.get(p.projectId);
			if (existing) existing.value += value;
			else totals.set(p.projectId, { name: p.projectName, value });
		}
	}
	const ranked = Array.from(totals.entries()).sort(
		(a, b) => b[1].value - a[1].value,
	);
	const colorFor = new Map<string, string>();
	ranked.forEach(([id], i) => {
		colorFor.set(id, palette[i % palette.length]!);
	});

	const columns: BarColumn[] = data.map((point) => {
		const value = metric === "amount" ? point.amount : point.hours;
		return {
			label: point.label,
			value,
			valueLabel:
				metric === "amount"
					? value >= 1
						? formatMoney(value)
						: ""
					: value >= 0.5
						? String(Math.round(value))
						: value > 0
							? "<1"
							: "",
			segments: point.projects.map((p) => ({
				value: metric === "amount" ? p.amount : p.ms,
				color: colorFor.get(p.projectId) ?? palette[0]!,
			})),
		};
	});

	const grandTotal = data.reduce(
		(sum, p) => sum + (metric === "amount" ? p.amount : p.hours),
		0,
	);

	return (
		<box style={{ flexDirection: "column", width: "100%" }}>
			<BarChart
				columns={columns}
				width={width}
				theme={theme}
				height={height}
				minBarWidth={minBarWidth}
				maxBarWidth={maxBarWidth}
				maxColumns={maxColumns}
				emptyMessage={emptyMessage}
			/>
			{(showLegend || showTotal) && data.length > 0 && (
				<box
					style={{
						flexDirection: "row",
						gap: 2,
						marginTop: 1,
						flexWrap: "wrap",
					}}
				>
					{showLegend &&
						ranked.slice(0, 5).map(([id, p]) => (
							<text key={id}>
								<span fg={colorFor.get(id)}>●</span>
								<span fg={colors.textSecondary}> {p.name.slice(0, 14)}</span>
							</text>
						))}
					{showTotal && (
						<text>
							<span fg={colors.textSecondary}>Total: </span>
							<span fg={colors.textPrimary} attributes="bold">
								{metric === "amount"
									? formatMoney(grandTotal)
									: formatHours(grandTotal)}
							</span>
						</text>
					)}
				</box>
			)}
		</box>
	);
}

// ---------------------------------------------------------------------------
// Horizontal bar
// ---------------------------------------------------------------------------

interface HBarProps {
	value: number;
	max: number;
	width: number;
	color: string;
	theme: Theme;
	/** Draw the unfilled remainder as a faint track. */
	track?: boolean;
}

export function HBar({ value, max, width, color, theme, track = true }: HBarProps) {
	const colors = theme.colors;
	const safeWidth = Math.max(1, Math.floor(width));
	const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
	const totalEighths = Math.round(ratio * safeWidth * 8);
	const full = Math.floor(totalEighths / 8);
	const remainder = totalEighths % 8;

	// A non-zero value should never render as nothing.
	const bar =
		"█".repeat(full) +
		(remainder > 0 ? H_EIGHTHS[remainder]! : value > 0 && full === 0 ? "▏" : "");
	const used = full + (bar.length > full ? 1 : 0);
	const rest = Math.max(0, safeWidth - used);

	return (
		<text>
			<span fg={color}>{bar}</span>
			{rest > 0 && (
				<span fg={colors.borderSubtle}>{(track ? "░" : " ").repeat(rest)}</span>
			)}
		</text>
	);
}

/** A labeled horizontal bar row: `Label ████░░░  12.5h  34%` */
interface HBarRowProps {
	label: string;
	value: number;
	max: number;
	color: string;
	theme: Theme;
	barWidth?: number;
	labelWidth?: number;
	valueText: string;
	suffix?: string;
	highlight?: boolean;
}

export function HBarRow({
	label,
	value,
	max,
	color,
	theme,
	barWidth = 24,
	labelWidth = 14,
	valueText,
	suffix,
	highlight = false,
}: HBarRowProps) {
	const colors = theme.colors;
	const name =
		label.length > labelWidth
			? `${label.slice(0, labelWidth - 1)}…`
			: label.padEnd(labelWidth, " ");

	return (
		<box style={{ flexDirection: "row", gap: 1 }}>
			<text fg={highlight ? colors.textPrimary : colors.textSecondary}>
				{name}
			</text>
			<HBar value={value} max={max} width={barWidth} color={color} theme={theme} />
			<text fg={colors.textPrimary}>{valueText.padStart(8, " ")}</text>
			{suffix !== undefined && (
				<text fg={colors.textMuted}>{suffix.padStart(6, " ")}</text>
			)}
		</box>
	);
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

export function Sparkline({
	values,
	color,
	max,
}: {
	values: number[];
	color: string;
	max?: number;
}) {
	if (values.length === 0) return <text> </text>;
	const peak = max ?? values.reduce((m, v) => Math.max(m, v), 0);
	const chars = values
		.map((v) => {
			if (peak <= 0) return SPARK[0]!;
			const idx = Math.min(
				SPARK.length - 1,
				Math.max(0, Math.round((v / peak) * (SPARK.length - 1))),
			);
			return SPARK[idx]!;
		})
		.join("");
	return <text fg={color}>{chars}</text>;
}

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

interface StatTileProps {
	label: string;
	value: string;
	theme: Theme;
	sub?: string;
	subColor?: string;
	valueColor?: string;
	accent?: string;
	minWidth?: number;
}

export function StatTile({
	label,
	value,
	theme,
	sub,
	subColor,
	valueColor,
	accent,
	minWidth = 18,
}: StatTileProps) {
	const colors = theme.colors;
	return (
		<box
			style={{
				border: true,
				borderColor: accent ?? colors.borderSubtle,
				flexDirection: "column",
				paddingLeft: 1,
				paddingRight: 1,
				minWidth,
				flexGrow: 1,
				flexShrink: 1,
				flexBasis: 0,
			}}
		>
			<text fg={colors.textMuted}>{label.toUpperCase()}</text>
			<text fg={valueColor ?? colors.textPrimary} attributes="bold">
				{value}
			</text>
			<text fg={subColor ?? colors.textSecondary}>{sub ?? " "}</text>
		</box>
	);
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** A single-line proportional bar split into colored segments. */
export function SegmentBar({
	segments,
	width,
	theme,
}: {
	segments: { value: number; color: string }[];
	width: number;
	theme: Theme;
}) {
	const colors = theme.colors;
	// Zero-value segments would otherwise soak up the rounding remainder.
	const visible = segments.filter((s) => s.value > 0);
	const total = visible.reduce((sum, s) => sum + s.value, 0);
	const safeWidth = Math.max(1, Math.floor(width));

	if (total <= 0) {
		return <text fg={colors.borderSubtle}>{"░".repeat(safeWidth)}</text>;
	}

	const parts: ReactNode[] = [];
	let used = 0;
	visible.forEach((seg, i) => {
		const isLast = i === visible.length - 1;
		const w = isLast
			? safeWidth - used
			: Math.round((seg.value / total) * safeWidth);
		if (w <= 0) return;
		used += w;
		parts.push(
			<span key={i} fg={seg.color}>
				{"█".repeat(w)}
			</span>,
		);
	});

	return <text>{parts}</text>;
}

/** Left-aligned key/value line used throughout the report panels. */
export function StatRow({
	label,
	value,
	theme,
	labelWidth = 22,
	valueColor,
	hint,
}: {
	label: string;
	value: string;
	theme: Theme;
	labelWidth?: number;
	valueColor?: string;
	hint?: string;
}) {
	const colors = theme.colors;
	return (
		<text>
			<span fg={colors.textSecondary}>{label.padEnd(labelWidth, " ")}</span>
			<span fg={valueColor ?? colors.textPrimary} attributes="bold">
				{value}
			</span>
			{hint ? <span fg={colors.textMuted}>{`  ${hint}`}</span> : null}
		</text>
	);
}
