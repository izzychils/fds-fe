/**
 * API transport
 * =============
 * The single place where `fetch` is called. UI components never fetch directly:
 * they call a service, and the service either reads the development repository
 * or delegates here when a backend is configured.
 *
 * Configure `VITE_API_URL` to switch the whole product over to live HTTP.
 */

export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";

/** `true` = the localStorage development adapter is serving every request. */
export const IS_MOCK_MODE = API_URL.length === 0;

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RequestOptions {
  /** Bearer token from the auth service, when the backend is live. */
  token?: string | null;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | null | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = `${API_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

async function request<T>(method: Method, path: string, body?: unknown, options: RequestOptions = {}) {
  if (IS_MOCK_MODE) {
    throw new ApiError(
      `No backend configured. "${method} ${path}" fell through to the mock adapter, ` +
        `which should have handled it. Check the service implementation.`,
      0,
    );
  }

  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options.signal,
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : undefined) ?? `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};

/**
 * DEVELOPMENT PAYMENT TRANSPORT
 * -----------------------------
 * There is no payment provider wired up. Checkout never claims a payment
 * succeeded from thin air: this adapter returns a clearly-labelled development
 * reference, and `paymentStatus` is reported as "pending" until a real provider
 * (e.g. Paystack/Flutterwave) confirms it server-side.
 */
export interface PaymentIntent {
  reference: string;
  status: "pending" | "paid" | "failed";
  provider: "development";
  message: string;
}

export async function createDevelopmentPaymentIntent(args: {
  amount: number;
  orderId: string;
}): Promise<PaymentIntent> {
  await new Promise((resolve) => setTimeout(resolve, 650));
  return {
    reference: `DEV-PAY-${args.orderId}`,
    status: "pending",
    provider: "development",
    message:
      "Development payment transport, no card was charged and no provider confirmed this transaction.",
  };
}
