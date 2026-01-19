import Stripe from "stripe";

// Get or create Stripe customer, returns Stripe customer ID
export async function getOrCreateStripeCustomer(
  apiKey: string,
  customer: { name: string; email: string; stripeCustomerId: string | null },
): Promise<string> {
  const stripe = new Stripe(apiKey);

  // If we already have a Stripe customer ID, verify it exists
  if (customer.stripeCustomerId) {
    try {
      await stripe.customers.retrieve(customer.stripeCustomerId);
      return customer.stripeCustomerId;
    } catch {
      // Customer was deleted in Stripe, create new one
    }
  }

  // Search by email first
  const existing = await stripe.customers.list({ email: customer.email, limit: 1 });
  if (existing.data[0]) {
    return existing.data[0].id;
  }

  // Create new customer
  const newCustomer = await stripe.customers.create({
    name: customer.name,
    email: customer.email,
  });
  return newCustomer.id;
}

// Line item for invoice creation
export interface InvoiceLineItem {
  description: string;
  hours: number;
  rate: number;
  startTime: Date;
  endTime: Date;
}

// Create draft invoice with line items
export async function createDraftInvoice(
  apiKey: string,
  stripeCustomerId: string,
  projectName: string,
  lineItems: InvoiceLineItem[],
): Promise<string> {
  const stripe = new Stripe(apiKey);

  // Create pending invoice items first (they'll be collected into the invoice)
  for (const item of lineItems) {
    const amount = Math.round(item.hours * item.rate * 100); // Stripe uses cents
    if (amount <= 0) continue; // Skip zero-amount items

    // Format hours with 2 decimal places
    const hoursFormatted = item.hours.toFixed(2);

    // Format start and end times
    const formatTime = (date: Date) => date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const timeRange = `${formatTime(item.startTime)} - ${formatTime(item.endTime)}`;

    // Format: "4.75 hour(s) :: Project Name :: Description"
    const description = `${hoursFormatted} hour(s) :: ${projectName} :: ${item.description}`;

    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount,
      currency: "usd",
      description,
      metadata: {
        project: projectName,
        start_time: item.startTime.toISOString(),
        end_time: item.endTime.toISOString(),
        time_range: timeRange,
        hours: hoursFormatted,
      },
    });
  }

  // Create invoice - this will automatically include all pending invoice items
  const invoice = await stripe.invoices.create({
    customer: stripeCustomerId,
    auto_advance: false, // Keep as draft
    collection_method: "send_invoice",
    days_until_due: 30,
    pending_invoice_items_behavior: "include",
  });

  return invoice.id;
}

// Invoice display type
export interface StripeInvoiceItem {
  id: string;
  number: string | null;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  amount: number;
  currency: string;
  created: Date;
  dueDate: Date | null;
  hostedUrl: string | null;
  dashboardUrl: string;
}

export interface ListInvoicesResult {
  invoices: StripeInvoiceItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

// Cache for invoice list requests (2 minute TTL)
const CACHE_TTL_MS = 2 * 60 * 1000;
const invoiceCache = new Map<string, { data: ListInvoicesResult; timestamp: number }>();

function getCacheKey(apiKey: string, cursor?: string): string {
  // Use last 8 chars of API key + cursor for cache key
  return `${apiKey.slice(-8)}:${cursor ?? "first"}`;
}

// Clear the invoice cache (call after creating new invoices)
export function clearInvoiceCache(): void {
  invoiceCache.clear();
}

// List invoices from Stripe with pagination and caching
export async function listInvoices(
  apiKey: string,
  limit = 25,
  startingAfter?: string,
  forceRefresh = false,
): Promise<ListInvoicesResult> {
  const cacheKey = getCacheKey(apiKey, startingAfter);

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = invoiceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const stripe = new Stripe(apiKey);

  const params: Stripe.InvoiceListParams = {
    limit,
    expand: ["data.customer"],
  };

  if (startingAfter) {
    params.starting_after = startingAfter;
  }

  const response = await stripe.invoices.list(params);

  const invoices: StripeInvoiceItem[] = response.data.map((inv) => {
    const customer = inv.customer as Stripe.Customer | null;
    return {
      id: inv.id,
      number: inv.number,
      customerName: customer?.name ?? null,
      customerEmail: customer?.email ?? null,
      status: inv.status ?? "unknown",
      amount: inv.amount_due / 100, // Convert from cents
      currency: inv.currency,
      created: new Date(inv.created * 1000),
      dueDate: inv.due_date ? new Date(inv.due_date * 1000) : null,
      hostedUrl: inv.hosted_invoice_url ?? null,
      dashboardUrl: `https://dashboard.stripe.com/invoices/${inv.id}`,
    };
  });

  const result: ListInvoicesResult = {
    invoices,
    hasMore: response.has_more,
    nextCursor: response.data.length > 0 ? response.data[response.data.length - 1]?.id ?? null : null,
  };

  // Store in cache
  invoiceCache.set(cacheKey, { data: result, timestamp: Date.now() });

  return result;
}
