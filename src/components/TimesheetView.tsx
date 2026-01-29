import {
	type TimesheetGroup,
	type AllTimersWeekData,
	type Theme,
	formatDateInTimezone,
	formatTimeInTimezone,
} from "../types.ts";

interface TimesheetViewProps {
	groups: TimesheetGroup[];
	selectedGroupIndex: number;
	selectedEntryIndex: number;
	selectedEntryIds: Set<string>;
	focused: boolean;
	timezone: string;
	theme: Theme;
	// All timers mode props
	showAllTimers?: boolean;
	allTimersWeekData?: AllTimersWeekData | null;
	allTimersSelectedIndex?: number;
	hasOlderWeeks?: boolean;
	hasNewerWeeks?: boolean;
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

function formatCurrency(amount: number): string {
	return `$${amount.toFixed(2)}`;
}

function formatWeekRange(weekStart: Date, weekEnd: Date, timezone: string): string {
	const startStr = formatDateInTimezone(weekStart, timezone);
	const endDate = new Date(weekEnd);
	endDate.setDate(endDate.getDate() - 1); // weekEnd is exclusive, so show the last day of the week
	const endStr = formatDateInTimezone(endDate, timezone);
	return `${startStr} - ${endStr}`;
}

// Column widths for table layout
const COL = {
	checkbox: 4, // [x] + space
	date: 7, // "Jan 17" + space
	time: 22, // "9:00 AM - 5:00 PM" + space
	duration: 9, // "10h 30m" + space
	amount: 10, // "$1000.00" + space
	project: 15, // Project name
};

export function TimesheetView({
	groups,
	selectedGroupIndex,
	selectedEntryIndex,
	selectedEntryIds,
	focused,
	timezone,
	theme,
	showAllTimers = false,
	allTimersWeekData,
	allTimersSelectedIndex = 0,
	hasOlderWeeks = false,
	hasNewerWeeks = false,
}: TimesheetViewProps) {
	const colors = theme.colors;

	// All Timers Mode
	if (showAllTimers) {
		return (
			<box
				style={{
					flexGrow: 1,
					flexDirection: "column",
					padding: 1,
				}}
			>
				{/* Header with week navigation */}
				<box
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						marginBottom: 1,
					}}
				>
					<text>
						<span fg={colors.textPrimary} attributes="bold">All Timers</span>
						<span fg={colors.textSecondary}> (press 'a' to show billable only)</span>
					</text>
					<text fg={colors.textSecondary}>
						{hasOlderWeeks ? "[" : " "}
						{" ← Week → "}
						{hasNewerWeeks ? "]" : " "}
					</text>
				</box>

				{/* Week info bar - always show when we have week data */}
				{allTimersWeekData && (
					<box
						style={{
							flexDirection: "row",
							justifyContent: "space-between",
							backgroundColor: colors.surface,
							paddingLeft: 1,
							paddingRight: 1,
							marginBottom: 1,
						}}
					>
						<text fg={colors.textPrimary}>
							{formatWeekRange(allTimersWeekData.weekStart, allTimersWeekData.weekEnd, timezone)}
						</text>
						<text>
							<span fg={colors.textSecondary}>Total: </span>
							<span fg={colors.success} attributes="bold">
								{formatDuration(allTimersWeekData.totalMs)}
							</span>
						</text>
					</box>
				)}

				{!allTimersWeekData || allTimersWeekData.entries.length === 0 ? (
					<box
						style={{
							flexGrow: 1,
							justifyContent: "center",
							alignItems: "center",
						}}
					>
						<text fg={colors.textSecondary}>No time entries for this week</text>
					</box>
				) : (
					<scrollbox focused={focused} style={{ flexGrow: 1 }}>
						{allTimersWeekData.entries.map((entry, index) => {
							const isSelected = index === allTimersSelectedIndex;
							const duration = entry.endTime
								? new Date(entry.endTime).getTime() -
									new Date(entry.startTime).getTime()
								: 0;
							const rate = entry.project.hourlyRate ?? 0;
							const amount = (duration / 3600000) * rate;

							const dateStr = formatDateInTimezone(entry.startTime, timezone);
							const timeStart = formatTimeInTimezone(entry.startTime, timezone);
							const timeEnd = entry.endTime
								? formatTimeInTimezone(entry.endTime, timezone)
								: "";
							const timeRange = timeEnd
								? `${timeStart} - ${timeEnd}`
								: timeStart;
							const durationStr = formatDuration(duration);
							const amountStr = rate > 0 ? formatCurrency(amount) : "-";

							return (
								<box
									key={entry.id}
									style={{
										flexDirection: "row",
										backgroundColor: isSelected
											? colors.selectedRowBg
											: "transparent",
										paddingLeft: 1,
										paddingRight: 1,
									}}
								>
									{/* Date */}
									<box style={{ width: COL.date }}>
										<text fg={colors.textSecondary}>{dateStr}</text>
									</box>
									{/* Time Range */}
									<box style={{ width: COL.time }}>
										<text fg={colors.textMuted}>{timeRange}</text>
									</box>
									{/* Duration */}
									<box style={{ width: COL.duration }}>
										<text fg={colors.textSecondary}>{durationStr}</text>
									</box>
									{/* Project */}
									<box style={{ width: COL.project }}>
										<text fg={entry.project.color}>
											{entry.project.name.length > 13
												? entry.project.name.substring(0, 12) + "…"
												: entry.project.name}
										</text>
									</box>
									{/* Amount */}
									<box style={{ width: COL.amount }}>
										<text fg={rate > 0 ? colors.success : colors.textMuted}>{amountStr}</text>
									</box>
									{/* Description */}
									<box style={{ flexGrow: 1 }}>
										<text fg={isSelected ? colors.selectedText : colors.textPrimary}>
											{entry.description || ""}
										</text>
									</box>
								</box>
							);
						})}
					</scrollbox>
				)}
			</box>
		);
	}

	// Default Timesheets Mode (billable only)
	if (groups.length === 0) {
		return (
			<box
				style={{
					flexGrow: 1,
					flexDirection: "column",
					padding: 1,
				}}
			>
				<box
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
					}}
				>
					<text>
						<span fg={colors.textPrimary}>Timesheets</span>
						<span fg={colors.textSecondary}> (press 'a' to show all timers)</span>
					</text>
				</box>

				<box
					style={{
						flexGrow: 1,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text fg={colors.textSecondary}>No uninvoiced time entries</text>
				</box>
			</box>
		);
	}

	return (
		<box
			style={{
				flexGrow: 1,
				flexDirection: "column",
				padding: 1,
			}}
		>
			{/* Header */}
			<box
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					marginBottom: 1,
				}}
			>
				<text>
					<span fg={colors.textPrimary} attributes="bold">Timesheets</span>
					<span fg={colors.textSecondary}> (press 'a' to show all timers)</span>
				</text>
			</box>

			<scrollbox focused={focused} style={{ flexGrow: 1 }}>
				{groups.map((group, groupIndex) => {
					const isSelectedGroup = groupIndex === selectedGroupIndex;

					return (
						<box key={group.project.id} style={{ flexDirection: "column" }}>
							{/* Project Header */}
							<box
								style={{
									flexDirection: "row",
									justifyContent: "space-between",
									backgroundColor: isSelectedGroup ? colors.surface : "transparent",
									paddingLeft: 1,
									paddingRight: 1,
									marginTop: groupIndex > 0 ? 1 : 0,
								}}
							>
								<text>
									<span fg={group.project.color} attributes="bold">
										{group.project.name}
									</span>
									{group.project.customer && (
										<span fg={colors.accentSecondary}> ({group.project.customer.name})</span>
									)}
									{!group.project.customer && (
										<span fg={colors.error}> (No customer)</span>
									)}
								</text>
								<text>
									<span fg={colors.textSecondary}>{formatDuration(group.totalMs)}</span>
									{group.project.hourlyRate != null && (
										<span fg={colors.success}>
											{" "}
											{formatCurrency(group.totalAmount)}
										</span>
									)}
								</text>
							</box>

							{/* Time Entries */}
							{group.entries.map((entry, entryIndex) => {
								const isSelected =
									isSelectedGroup && entryIndex === selectedEntryIndex;
								const isChecked = selectedEntryIds.has(entry.id);
								const duration = entry.endTime
									? new Date(entry.endTime).getTime() -
										new Date(entry.startTime).getTime()
									: 0;
								const rate = group.project.hourlyRate ?? 0;
								const amount = (duration / 3600000) * rate;

								const dateStr = formatDateInTimezone(entry.startTime, timezone);
								const timeStart = formatTimeInTimezone(
									entry.startTime,
									timezone,
								);
								const timeEnd = entry.endTime
									? formatTimeInTimezone(entry.endTime, timezone)
									: "";
								const timeRange = timeEnd
									? `${timeStart} - ${timeEnd}`
									: timeStart;
								const durationStr = formatDuration(duration);
								const amountStr = rate > 0 ? formatCurrency(amount) : "";

								return (
									<box
										key={entry.id}
										style={{
											flexDirection: "row",
											backgroundColor: isSelected
												? colors.selectedRowBg
												: "transparent",
											paddingLeft: 2,
											paddingRight: 1,
										}}
									>
										{/* Checkbox */}
										<box style={{ width: COL.checkbox }}>
											<text fg={isChecked ? colors.success : colors.textMuted}>
												{isChecked ? "[x]" : "[ ]"}
											</text>
										</box>
										{/* Date */}
										<box style={{ width: COL.date }}>
											<text fg={colors.textSecondary}>{dateStr}</text>
										</box>
										{/* Time Range */}
										<box style={{ width: COL.time }}>
											<text fg={colors.textMuted}>{timeRange}</text>
										</box>
										{/* Duration */}
										<box style={{ width: COL.duration }}>
											<text fg={colors.textSecondary}>{durationStr}</text>
										</box>
										{/* Amount */}
										<box style={{ width: COL.amount }}>
											<text fg={colors.success}>{amountStr}</text>
										</box>
										{/* Description */}
										<box style={{ flexGrow: 1 }}>
											<text fg={isSelected ? colors.selectedText : colors.textPrimary}>
												{entry.description || ""}
											</text>
										</box>
									</box>
								);
							})}
						</box>
					);
				})}
			</scrollbox>
		</box>
	);
}
