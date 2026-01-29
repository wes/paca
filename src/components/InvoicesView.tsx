import type { Theme } from "../types.ts";
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
	theme: Theme;
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

function getStatusColor(status: string, colors: Theme["colors"]): string {
	switch (status) {
		case "paid":
			return colors.success;
		case "open":
			return colors.warning;
		case "draft":
			return colors.textMuted;
		case "void":
			return colors.error;
		case "uncollectible":
			return colors.error;
		default:
			return colors.textSecondary;
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
	theme,
}: InvoicesViewProps) {
	const colors = theme.colors;

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
					<text fg={colors.textPrimary}>Invoices</text>
				</box>
				<text fg={colors.borderOff}>{"─".repeat(200)}</text>
				<box
					style={{
						flexGrow: 1,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text fg={colors.error}>No Stripe API key configured.</text>
					<text fg={colors.textSecondary}>Add one in Settings to view invoices.</text>
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
					<text fg={colors.textPrimary}>Invoices</text>
				</box>

				<box
					style={{
						flexGrow: 1,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text fg={colors.textSecondary}>Loading invoices from Stripe...</text>
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
					<text fg={colors.textPrimary}>Invoices</text>
				</box>

				<box
					style={{
						flexGrow: 1,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text fg={colors.error}>Error: {error}</text>
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
					<text fg={colors.textPrimary}>Invoices</text>
				</box>

				<box
					style={{
						flexGrow: 1,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<text fg={colors.textSecondary}>No invoices found in Stripe</text>
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
					<text fg={colors.textSecondary}>Invoice ID</text>
				</box>
				<box style={{ width: COL.date }}>
					<text fg={colors.textSecondary}>Date</text>
				</box>
				<box style={{ width: COL.status }}>
					<text fg={colors.textSecondary}>Status</text>
				</box>
				<box style={{ flexGrow: 1 }}>
					<text fg={colors.textSecondary}>Client</text>
				</box>

				<box style={{ width: COL.amount, alignItems: "flex-end" }}>
					<text fg={colors.textSecondary}>Amount</text>
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
									? colors.selectedRowBg
									: "transparent",
								paddingLeft: 1,
								paddingRight: 1,
							}}
						>
							{/* Invoice ID */}
							<box style={{ width: COL.invoiceId }}>
								<text fg={isSelected ? colors.selectedText : colors.textPrimary}>
									{invoice.number || invoice.id.slice(-8)}
								</text>
							</box>
							{/* Date */}
							<box style={{ width: COL.date }}>
								<text fg={colors.textSecondary}>{formatDate(invoice.created)}</text>
							</box>
							{/* Status */}
							<box style={{ width: COL.status }}>
								<text fg={getStatusColor(invoice.status, colors)}>
									{invoice.status}
								</text>
							</box>
							{/* Client */}
							<box style={{ flexGrow: 1 }}>
								<text fg={isSelected ? colors.selectedText : colors.textPrimary}>
									{invoice.customerName || invoice.customerEmail || "Unknown"}
								</text>
							</box>

							{/* Amount */}
							<box style={{ width: COL.amount, alignItems: "flex-end" }}>
								<text fg={colors.success}>
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
