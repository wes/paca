import { useKeyboard } from "@opentui/react";
import {
	type Customer,
	type TimeEntryWithProject,
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
}: CreateInvoiceModalProps) {
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
		<Modal title="Create Stripe Invoice" height={Math.max(modalHeight, 20)}>
			{/* Customer info */}
			{customer && (
				<box style={{ flexDirection: "row", marginTop: 1, gap: 1 }}>
					<text fg="#8b5cf6" attributes="bold">
						{customer.name}
					</text>
					<text fg="#64748b">{customer.email}</text>
				</box>
			)}

			{!customer && (
				<box style={{ marginTop: 1 }}>
					<text fg="#ef4444">
						This project has no customer linked. Please link a customer first
						using the 'c' key in the Projects view.
					</text>
				</box>
			)}

			{!hasStripeKey && customer && (
				<box style={{ marginTop: 1 }}>
					<text fg="#ef4444">
						No Stripe API key configured. Add one in Settings to create
						invoices.
					</text>
				</box>
			)}

			{customer && hasStripeKey && (
				<>
					{/* Line items header */}
					<text fg="#334155" style={{ marginTop: 1 }}>
						{"─".repeat(56)}
					</text>
					<box style={{ flexDirection: "row", gap: 1 }}>
						<box style={{ width: 8 }}>
							<text fg="#94a3b8">Date</text>
						</box>
						<box style={{ flexGrow: 1 }}>
							<text fg="#94a3b8">Description</text>
						</box>
						<box style={{ width: 8 }}>
							<text fg="#94a3b8">Hours</text>
						</box>
						{hourlyRate != null && (
							<box style={{ width: 10, alignItems: "flex-end" }}>
								<text fg="#94a3b8">Amount</text>
							</box>
						)}
					</box>

					{/* Line items */}
					<scrollbox style={{ maxHeight: 8 }}>
						{lineItems.map((item, idx) => (
							<box key={idx} style={{ flexDirection: "row", gap: 1 }}>
								<box style={{ width: 8 }}>
									<text fg="#64748b">{item.date}</text>
								</box>
								<box style={{ flexGrow: 1 }}>
									<text fg="#e2e8f0">
										{item.description.length > 30
											? `${item.description.slice(0, 27)}...`
											: item.description}
									</text>
								</box>
								<box style={{ width: 8 }}>
									<text fg="#94a3b8">{item.hours}</text>
								</box>
								{hourlyRate != null && (
									<box style={{ width: 10, alignItems: "flex-end" }}>
										<text fg="#10b981">${item.amount.toFixed(2)}</text>
									</box>
								)}
							</box>
						))}
					</scrollbox>

					{/* Totals */}
					<text fg="#334155">{"─".repeat(56)}</text>
					<box style={{ flexDirection: "row", gap: 1 }}>
						<box style={{ width: 8 }}>
							<text fg="#ffffff" attributes="bold">
								Total
							</text>
						</box>
						<box style={{ flexGrow: 1 }}>
							<text fg="#94a3b8">
								{entries.length} {entries.length === 1 ? "entry" : "entries"}
							</text>
						</box>
						<box style={{ width: 8 }}>
							<text fg="#ffffff" attributes="bold">
								{totalHours.toFixed(2)}
							</text>
						</box>
						{hourlyRate != null && (
							<box style={{ width: 10, alignItems: "flex-end" }}>
								<text fg="#10b981" attributes="bold">
									${totalAmount.toFixed(2)}
								</text>
							</box>
						)}
					</box>

					{hourlyRate != null && (
						<box style={{ marginTop: 1 }}>
							<text fg="#64748b">Rate: ${hourlyRate.toFixed(2)}/hr</text>
						</box>
					)}
				</>
			)}

			<box style={{ flexGrow: 1 }} />

			<text fg="#64748b">
				{customer && hasStripeKey
					? "Enter to create draft invoice, Esc to cancel"
					: "Esc to close"}
			</text>
		</Modal>
	);
}
