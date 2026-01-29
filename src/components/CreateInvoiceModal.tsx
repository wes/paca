import { useKeyboard } from "@opentui/react";
import {
	CATPPUCCIN_MOCHA,
	type Customer,
	type TimeEntryWithProject,
	type Theme,
	formatDateInTimezone,
} from "../types.ts";
import Modal from "./Modal.tsx";

interface CreateInvoiceModalProps {
	projectName: string;
	projectColor: string;
	hourlyRate: number | null;
	customer: Customer | null;
	entries: TimeEntryWithProject[];
	timezone: string;
	hasStripeKey: boolean;
	onConfirm: () => void;
	onCancel: () => void;
	theme?: Theme;
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

function formatHours(ms: number): string {
	const hours = ms / 3600000;
	return hours.toFixed(2);
}

export function CreateInvoiceModal({
	projectName,
	projectColor,
	hourlyRate,
	customer,
	entries,
	timezone,
	hasStripeKey,
	onConfirm,
	onCancel,
	theme = CATPPUCCIN_MOCHA,
}: CreateInvoiceModalProps) {
	const colors = theme.colors;

	useKeyboard((key) => {
		if (key.name === "escape") {
			onCancel();
			return;
		}
		if (key.name === "return") {
			if (!customer || !hasStripeKey) {
				return;
			}
			onConfirm();
			return;
		}
	});

	// Calculate totals
	const totalMs = entries.reduce((sum, e) => {
		if (!e.endTime) return sum;
		return (
			sum + (new Date(e.endTime).getTime() - new Date(e.startTime).getTime())
		);
	}, 0);

	const totalHours = totalMs / 3600000;
	const totalAmount = hourlyRate ? totalHours * hourlyRate : 0;

	// Prepare line items
	const lineItems = entries
		.filter((e) => e.endTime)
		.map((e) => {
			const durationMs =
				new Date(e.endTime!).getTime() - new Date(e.startTime).getTime();
			const hours = durationMs / 3600000;
			const amount = hourlyRate ? hours * hourlyRate : 0;
			return {
				date: formatDateInTimezone(e.startTime, timezone),
				description: e.description || "Work",
				duration: formatDuration(durationMs),
				hours: formatHours(durationMs),
				amount,
			};
		});

	// Calculate modal height based on content
	const baseHeight = 14;
	const lineItemsHeight = Math.min(lineItems.length, 8); // Cap at 8 visible items
	const modalHeight = !customer
		? 12
		: !hasStripeKey
			? 14
			: baseHeight + lineItemsHeight;

	return (
		<Modal title="Create Stripe Invoice" height={Math.max(modalHeight, 20)} theme={theme}>
			{/* Customer info */}
			{customer && (
				<box style={{ flexDirection: "row", marginTop: 1, gap: 1 }}>
					<text fg={colors.accentSecondary} attributes="bold">
						{customer.name}
					</text>
					<text fg={colors.textMuted}>{customer.email}</text>
				</box>
			)}

			{!customer && (
				<box style={{ marginTop: 1 }}>
					<text fg={colors.error}>
						This project has no customer linked. Please link a customer first
						using the 'c' key in the Projects view.
					</text>
				</box>
			)}

			{!hasStripeKey && customer && (
				<box style={{ marginTop: 1 }}>
					<text fg={colors.error}>
						No Stripe API key configured. Add one in Settings to create
						invoices.
					</text>
				</box>
			)}

			{customer && hasStripeKey && (
				<>
					{/* Line items header */}
					<text fg={colors.borderSubtle} style={{ marginTop: 1 }}>
						{"─".repeat(56)}
					</text>
					<box style={{ flexDirection: "row", gap: 1 }}>
						<box style={{ width: 8 }}>
							<text fg={colors.accentSecondary}>Date</text>
						</box>
						<box style={{ flexGrow: 1 }}>
							<text fg={colors.accentSecondary}>Description</text>
						</box>
						<box style={{ width: 8 }}>
							<text fg={colors.accentSecondary}>Hours</text>
						</box>
						{hourlyRate != null && (
							<box style={{ width: 10, alignItems: "flex-end" }}>
								<text fg={colors.accentSecondary}>Amount</text>
							</box>
						)}
					</box>

					{/* Line items */}
					<scrollbox style={{ maxHeight: 8 }}>
						{lineItems.map((item, idx) => (
							<box key={idx} style={{ flexDirection: "row", gap: 1 }}>
								<box style={{ width: 8 }}>
									<text fg={colors.textMuted}>{item.date}</text>
								</box>
								<box style={{ flexGrow: 1 }}>
									<text fg={colors.textPrimary}>
										{item.description.length > 30
											? `${item.description.slice(0, 27)}...`
											: item.description}
									</text>
								</box>
								<box style={{ width: 8 }}>
									<text fg={colors.accentSecondary}>{item.hours}</text>
								</box>
								{hourlyRate != null && (
									<box style={{ width: 10, alignItems: "flex-end" }}>
										<text fg={colors.success}>${item.amount.toFixed(2)}</text>
									</box>
								)}
							</box>
						))}
					</scrollbox>

					{/* Totals */}
					<text fg={colors.borderSubtle}>{"─".repeat(56)}</text>
					<box style={{ flexDirection: "row", gap: 1 }}>
						<box style={{ width: 8 }}>
							<text fg={colors.textPrimary} attributes="bold">
								Total
							</text>
						</box>
						<box style={{ flexGrow: 1 }}>
							<text fg={colors.accentSecondary}>
								{entries.length} {entries.length === 1 ? "entry" : "entries"}
							</text>
						</box>
						<box style={{ width: 8 }}>
							<text fg={colors.textPrimary} attributes="bold">
								{totalHours.toFixed(2)}
							</text>
						</box>
						{hourlyRate != null && (
							<box style={{ width: 10, alignItems: "flex-end" }}>
								<text fg={colors.success} attributes="bold">
									${totalAmount.toFixed(2)}
								</text>
							</box>
						)}
					</box>

					{hourlyRate != null && (
						<box style={{ marginTop: 1 }}>
							<text fg={colors.textMuted}>Rate: ${hourlyRate.toFixed(2)}/hr</text>
						</box>
					)}
				</>
			)}

			<box style={{ flexGrow: 1 }} />

			<text fg={colors.textMuted}>
				{customer && hasStripeKey
					? "Enter to create draft invoice, Esc to cancel"
					: "Esc to close"}
			</text>
		</Modal>
	);
}
