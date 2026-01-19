import {
	COLORS,
	type TimesheetGroup,
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

// Column widths for table layout
const COL = {
	checkbox: 4, // [x] + space
	date: 7, // "Jan 17" + space
	time: 22, // "9:00 AM - 5:00 PM" + space
	duration: 9, // "10h 30m" + space
	amount: 10, // "$1000.00" + space
};

export function TimesheetView({
	groups,
	selectedGroupIndex,
	selectedEntryIndex,
	selectedEntryIds,
	focused,
	timezone,
}: TimesheetViewProps) {
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
					<text fg="#ffffff">Timesheets</text>
				</box>

				<box
					style={{
						flexGrow: 1,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text fg="#64748b">No uninvoiced time entries</text>
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
									backgroundColor: isSelectedGroup ? "#1e293b" : "transparent",
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
										<span fg="#8b5cf6"> ({group.project.customer.name})</span>
									)}
									{!group.project.customer && (
										<span fg="#ef4444"> (No customer)</span>
									)}
								</text>
								<text>
									<span fg="#94a3b8">{formatDuration(group.totalMs)}</span>
									{group.project.hourlyRate != null && (
										<span fg="#10b981">
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
												? COLORS.selectedRowBg
												: "transparent",
											paddingLeft: 2,
											paddingRight: 1,
										}}
									>
										{/* Checkbox */}
										<box style={{ width: COL.checkbox }}>
											<text fg={isChecked ? "#10b981" : "#64748b"}>
												{isChecked ? "[x]" : "[ ]"}
											</text>
										</box>
										{/* Date */}
										<box style={{ width: COL.date }}>
											<text fg="#94a3b8">{dateStr}</text>
										</box>
										{/* Time Range */}
										<box style={{ width: COL.time }}>
											<text fg="#64748b">{timeRange}</text>
										</box>
										{/* Duration */}
										<box style={{ width: COL.duration }}>
											<text fg="#94a3b8">{durationStr}</text>
										</box>
										{/* Amount */}
										<box style={{ width: COL.amount }}>
											<text fg="#10b981">{amountStr}</text>
										</box>
										{/* Description */}
										<box style={{ flexGrow: 1 }}>
											<text fg={isSelected ? "#ffffff" : "#e2e8f0"}>
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
