import { useState, useEffect } from "react";
import { COLORS } from "../types";

interface DateTimePickerProps {
	value: Date;
	timezone: string;
	focused: boolean;
	onChange: (date: Date) => void;
}

type Field = "month" | "day" | "year" | "hour" | "minute" | "ampm";

const MONTHS = [
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

function getDatePartsInTimezone(
	date: Date,
	timezone: string,
): {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	hour12: number;
	ampm: "AM" | "PM";
} {
	try {
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: timezone,
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			hour12: true,
		});
		const parts = formatter.formatToParts(date);
		const get = (type: string) =>
			parts.find((p) => p.type === type)?.value || "";

		const hour24 = parseInt(get("hour"));
		const ampm = get("dayPeriod") as "AM" | "PM";

		return {
			year: parseInt(get("year")),
			month: parseInt(get("month")) - 1,
			day: parseInt(get("day")),
			hour: hour24,
			minute: parseInt(get("minute")),
			hour12: hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24,
			ampm: ampm || (hour24 >= 12 ? "PM" : "AM"),
		};
	} catch {
		// Fallback to local time
		const hour24 = date.getHours();
		return {
			year: date.getFullYear(),
			month: date.getMonth(),
			day: date.getDate(),
			hour: hour24,
			minute: date.getMinutes(),
			hour12: hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24,
			ampm: hour24 >= 12 ? "PM" : "AM",
		};
	}
}

function createDateInTimezone(
	year: number,
	month: number,
	day: number,
	hour12: number,
	minute: number,
	ampm: "AM" | "PM",
	timezone: string,
): Date {
	// Convert 12-hour to 24-hour
	let hour24 = hour12;
	if (ampm === "AM" && hour12 === 12) {
		hour24 = 0;
	} else if (ampm === "PM" && hour12 !== 12) {
		hour24 = hour12 + 12;
	}

	const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

	try {
		// Get the timezone offset for this date
		const testDate = new Date(dateStr + "Z");
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: timezone,
			timeZoneName: "shortOffset",
		});
		const parts = formatter.formatToParts(testDate);
		const offsetPart =
			parts.find((p) => p.type === "timeZoneName")?.value || "";

		const offsetMatch = offsetPart.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
		let offsetMinutes = 0;
		if (offsetMatch) {
			const sign = offsetMatch[1] === "-" ? -1 : 1;
			const hours = parseInt(offsetMatch[2] || "0", 10);
			const minutes = parseInt(offsetMatch[3] || "0", 10);
			offsetMinutes = sign * (hours * 60 + minutes);
		}

		const utcDate = new Date(dateStr + "Z");
		utcDate.setMinutes(utcDate.getMinutes() - offsetMinutes);
		return utcDate;
	} catch {
		// Fallback to local time
		return new Date(year, month, day, hour24, minute);
	}
}

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

export function DateTimePicker({
	value,
	timezone,
	focused,
	onChange,
}: DateTimePickerProps) {
	const parts = getDatePartsInTimezone(value, timezone);

	const [activeField, setActiveField] = useState<Field>("month");
	const [month, setMonth] = useState(parts.month);
	const [day, setDay] = useState(parts.day);
	const [year, setYear] = useState(parts.year);
	const [hour, setHour] = useState(parts.hour12);
	const [minute, setMinute] = useState(parts.minute);
	const [ampm, setAmpm] = useState<"AM" | "PM">(parts.ampm);

	// Update parent when values change
	useEffect(() => {
		const newDate = createDateInTimezone(
			year,
			month,
			day,
			hour,
			minute,
			ampm,
			timezone,
		);
		if (newDate.getTime() !== value.getTime()) {
			onChange(newDate);
		}
	}, [month, day, year, hour, minute, ampm]);

	const fields: Field[] = ["month", "day", "year", "hour", "minute", "ampm"];

	const handleKey = (key: string) => {
		if (!focused) return;

		// Navigation between fields
		if (key === "tab" || key === "right" || key === "l") {
			const idx = fields.indexOf(activeField);
			setActiveField(fields[(idx + 1) % fields.length] as Field);
			return;
		}
		if (key === "left" || key === "h") {
			const idx = fields.indexOf(activeField);
			setActiveField(
				fields[(idx - 1 + fields.length) % fields.length] as Field,
			);
			return;
		}

		// Value changes
		const increment =
			key === "up" || key === "k" ? 1 : key === "down" || key === "j" ? -1 : 0;
		if (increment === 0) return;

		const daysInMonth = getDaysInMonth(year, month);

		switch (activeField) {
			case "month":
				setMonth((m) => (m + increment + 12) % 12);
				// Adjust day if needed
				const newDaysInMonth = getDaysInMonth(
					year,
					(month + increment + 12) % 12,
				);
				if (day > newDaysInMonth) setDay(newDaysInMonth);
				break;
			case "day":
				setDay((d) => {
					const newDay = d + increment;
					if (newDay < 1) return daysInMonth;
					if (newDay > daysInMonth) return 1;
					return newDay;
				});
				break;
			case "year":
				setYear((y) => Math.max(2020, Math.min(2030, y + increment)));
				break;
			case "hour":
				setHour((h) => {
					const newHour = h + increment;
					if (newHour < 1) return 12;
					if (newHour > 12) return 1;
					return newHour;
				});
				break;
			case "minute":
				setMinute((m) => (m + increment + 60) % 60);
				break;
			case "ampm":
				setAmpm((a) => (a === "AM" ? "PM" : "AM"));
				break;
		}
	};

	// Expose key handler via a custom hook pattern
	useEffect(() => {
		if (!focused) return;

		const handler = (e: KeyboardEvent) => {
			if (
				[
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
					"Tab",
					"h",
					"j",
					"k",
					"l",
				].includes(e.key)
			) {
				e.preventDefault();
				const keyName = e.key.replace("Arrow", "").toLowerCase();
				handleKey(keyName);
			}
		};

		// Note: In @opentui/react, keyboard is handled differently
		// This is a placeholder - the actual keyboard handling is done via useKeyboard in parent
	}, [focused, activeField, month, day, year, hour, minute, ampm]);

	const fieldStyle = (field: Field) => ({
		paddingLeft: 1,
		paddingRight: 1,
		height: 3,
		backgroundColor:
			activeField === field && focused ? "#1e40af" : "transparent",
		borderColor:
			activeField === field && focused ? COLORS.border : COLORS.borderOff,
	});

	return {
		activeField,
		setActiveField,
		fields,
		handleKey,
		render: (
			<box style={{ flexDirection: "row", alignItems: "center" }}>
				{/* Date section */}
				<box
					style={{
						flexDirection: "row",
						alignItems: "center",
					}}
				>
					<box style={fieldStyle("month")}>
						<text
							fg={activeField === "month" && focused ? "#ffffff" : "#e2e8f0"}
						>
							{MONTHS[month]}
						</text>
					</box>
					<box style={fieldStyle("day")}>
						<text fg={activeField === "day" && focused ? "#ffffff" : "#e2e8f0"}>
							{String(day).padStart(2, "0")}
						</text>
					</box>
					<box style={fieldStyle("year")}>
						<text
							fg={activeField === "year" && focused ? "#ffffff" : "#e2e8f0"}
						>
							{year}
						</text>
					</box>
				</box>

				{/* Time section */}
				<box
					style={{
						flexDirection: "row",
						alignItems: "center",
					}}
				>
					<box style={fieldStyle("hour")}>
						<text
							fg={activeField === "hour" && focused ? "#ffffff" : "#e2e8f0"}
						>
							{String(hour).padStart(2, "0")}
						</text>
					</box>
					<text fg="#64748b">:</text>
					<box style={fieldStyle("minute")}>
						<text
							fg={activeField === "minute" && focused ? "#ffffff" : "#e2e8f0"}
						>
							{String(minute).padStart(2, "0")}
						</text>
					</box>
					<box style={fieldStyle("ampm")}>
						<text
							fg={activeField === "ampm" && focused ? "#ffffff" : "#e2e8f0"}
						>
							{ampm}
						</text>
					</box>
				</box>
			</box>
		),
	};
}
