import { COLORS } from "../types.ts";
import type { StripeInvoiceItem } from "../stripe.ts";

interface InvoicesViewProps {
	invoices: StripeInvoiceItem[];
	selectedIndex: number;
	focused: boolean;
	loading: boolean;
	error: string | null;
	hasStripeKey: boolean;
	currentPage: number;
	hasMore: boolean;
	hasPrevious: boolean;
}

function formatCurrency(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency.toUpperCase(),
	}).format(amount);
}

function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "numeric",
		day: "numeric",
		year: "numeric",
	});
}

function getStatusColor(status: string): string {
	switch (status) {
		case "paid":
			return "#10b981"; // green
		case "open":
			return "#f59e0b"; // amber
		case "draft":
			return "#64748b"; // gray
		case "void":
			return "#ef4444"; // red
		case "uncollectible":
			return "#ef4444"; // red
		default:
			return "#94a3b8";
	}
}

// Column widths for table layout (client column uses flexGrow for 100% width)
const COL = {
	invoiceId: 18,
	status: 10,
	date: 14,
	amount: 14,
};

export function InvoicesView({
	invoices,
	selectedIndex,
	focused,
	loading,
	error,
	hasStripeKey,
	currentPage,
	hasMore,
	hasPrevious,
}: InvoicesViewProps) {
	if (!hasStripeKey) {
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
					<text fg="#ffffff">Invoices</text>
				</box>
				<text fg={COLORS.borderOff}>{"─".repeat(200)}</text>
				<box
					style={{
						flexGrow: 1,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text fg="#ef4444">No Stripe API key configured.</text>
					<text fg="#64748b">Add one in Settings to view invoices.</text>
				</box>
			</box>
		);
	}

	if (loading) {
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
					<text fg="#ffffff">Invoices</text>
				</box>

				<box
					style={{
						flexGrow: 1,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text fg="#64748b">Loading invoices from Stripe...</text>
				</box>
			</box>
		);
	}

	if (error) {
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
					<text fg="#ffffff">Invoices</text>
				</box>

				<box
					style={{
						flexGrow: 1,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text fg="#ef4444">Error: {error}</text>
				</box>
			</box>
		);
	}

	if (invoices.length === 0) {
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
					<text fg="#ffffff">Invoices</text>
				</box>

				<box
					style={{
						flexGrow: 1,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text fg="#64748b">No invoices found in Stripe</text>
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
			<box
				style={{
					flexDirection: "row",
					paddingLeft: 1,
					paddingRight: 1,
				}}
			>
				<box style={{ width: COL.invoiceId }}>
					<text fg="#64748b">Invoice ID</text>
				</box>
				<box style={{ width: COL.date }}>
					<text fg="#64748b">Date</text>
				</box>
				<box style={{ width: COL.status }}>
					<text fg="#64748b">Status</text>
				</box>
				<box style={{ flexGrow: 1 }}>
					<text fg="#64748b">Client</text>
				</box>

				<box style={{ width: COL.amount, alignItems: "flex-end" }}>
					<text fg="#64748b">Amount</text>
				</box>
			</box>

			{/* Invoice List */}
			<scrollbox focused={focused} style={{ flexGrow: 1 }}>
				{invoices.map((invoice, index) => {
					const isSelected = index === selectedIndex;

					return (
						<box
							key={invoice.id}
							style={{
								flexDirection: "row",
								backgroundColor: isSelected
									? COLORS.selectedRowBg
									: "transparent",
								paddingLeft: 1,
								paddingRight: 1,
							}}
						>
							{/* Invoice ID */}
							<box style={{ width: COL.invoiceId }}>
								<text fg={isSelected ? "#ffffff" : "#e2e8f0"}>
									{invoice.number || invoice.id.slice(-8)}
								</text>
							</box>
							{/* Date */}
							<box style={{ width: COL.date }}>
								<text fg="#94a3b8">{formatDate(invoice.created)}</text>
							</box>
							{/* Status */}
							<box style={{ width: COL.status }}>
								<text fg={getStatusColor(invoice.status)}>
									{invoice.status}
								</text>
							</box>
							{/* Client */}
							<box style={{ flexGrow: 1 }}>
								<text fg={isSelected ? "#ffffff" : "#e2e8f0"}>
									{invoice.customerName || invoice.customerEmail || "Unknown"}
								</text>
							</box>

							{/* Amount */}
							<box style={{ width: COL.amount, alignItems: "flex-end" }}>
								<text fg="#10b981">
									{formatCurrency(invoice.amount, invoice.currency)}
								</text>
							</box>
						</box>
					);
				})}
			</scrollbox>
		</box>
	);
}
