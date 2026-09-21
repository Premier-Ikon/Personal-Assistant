const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function postApi<T>(body: Record<string, unknown>, token?: string): Promise<T> {
  if (!API_URL) {
    throw new ApiError("API URL is not configured", 500);
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Cannot reach Personal Assistant. Check NEXT_PUBLIC_API_URL.", 503);
  }
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string } & T;
  if (!response.ok || payload.ok === false) {
    throw new ApiError(payload.error || "Request failed", response.status);
  }
  return payload;
}

export async function publicApiRequest<T>(body: Record<string, unknown>): Promise<T> {
  return postApi<T>(body);
}

export async function apiRequest<T>(token: string, body: Record<string, unknown>): Promise<T> {
  return postApi<T>(body, token);
}

export type TeamUser = {
  uid: string;
  email: string;
  role: "admin" | "member";
  displayName: string;
};

export type TeamMember = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "member";
  active: boolean;
};

export type MailAccount = {
  id: string;
  clientName: string;
  email: string;
  displayName?: string;
  color: string;
  status: string;
  unreadCount?: number | null;
  emailFooter?: string;
  opsBrand?: string;
  connectedAt?: string | null;
};

export type ActionStep = {
  id?: string;
  title: string;
  detail: string;
  status?: string;
  automation?: string | null;
};

export type ShippingAddress = {
  name?: string;
  phone?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type ActionExecution = {
  brand?: string;
  ran?: boolean;
  ready?: boolean;
  result?: string;
  note?: string;
};

export type ActionPlan = {
  id: string;
  accountId: string;
  messageId: string;
  type: string;
  typeLabel: string;
  title: string;
  summary: string;
  steps: ActionStep[];
  status: string;
  extractedAddress?: ShippingAddress;
  extractedOrderNumber?: string;
  execution?: ActionExecution | null;
  createdAt?: string | null;
};

export type MailMessage = {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  unread?: boolean;
  bodyText?: string;
  draftReady?: boolean;
  actionPlan?: ActionPlan | null;
};

export type Draft = {
  id?: string;
  replySubject: string;
  replyBody: string;
  summary?: string;
  needsAction?: boolean;
  actionType?: string;
  provider?: string;
  model?: string;
};
