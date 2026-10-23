// Member messages and a record's contact paths. Pure parsing -- unit-tested.
// No email address is ever part of these shapes.

export interface Message {
  id: string;
  direction: "received" | "sent";
  otherLabel: string;
  otherPersonId: string | null;
  body: string;
  createdAt: string;
  read: boolean;
  replyToId: string | null;
}

export interface ContactOptions {
  hasAccount: boolean;
  isSelf: boolean;
  canMessage: boolean;
  orcidUrl: string | null;
  openalexUrl: string | null;
}

export const MESSAGE_MAX = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

export function parseMessages(data: unknown): Message[] {
  if (!Array.isArray(data)) return [];
  const out: Message[] = [];
  for (const raw of data) {
    if (!isRecord(raw)) continue;
    const id = str(raw.id);
    const body = str(raw.body);
    const createdAt = str(raw.createdAt);
    if (!id || !body || !createdAt) continue;
    out.push({
      id,
      direction: raw.direction === "sent" ? "sent" : "received",
      otherLabel: str(raw.otherLabel) ?? "A member",
      otherPersonId: str(raw.otherPersonId),
      body,
      createdAt,
      read: raw.read === true,
      replyToId: str(raw.replyToId),
    });
  }
  return out;
}

function httpsOrNull(value: unknown, host: RegExp): string | null {
  const s = str(value);
  return s && host.test(s) ? s : null;
}

export function parseContactOptions(data: unknown): ContactOptions {
  const r = isRecord(data) ? data : {};
  return {
    hasAccount: r.hasAccount === true,
    isSelf: r.isSelf === true,
    canMessage: r.canMessage === true,
    orcidUrl: httpsOrNull(r.orcidUrl, /^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/),
    openalexUrl: httpsOrNull(r.openalexUrl, /^https:\/\/openalex\.org\/A\d+$/),
  };
}

export type MessageCheck = { ok: true; body: string } | { ok: false; error: string };

export function checkMessage(value: unknown): MessageCheck {
  const body = typeof value === "string" ? value.trim() : "";
  if (body === "") return { ok: false, error: "Write a message first." };
  if (body.length > MESSAGE_MAX) return { ok: false, error: "The message is too long (2,000 characters at most)." };
  return { ok: true, body };
}
