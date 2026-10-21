// Reads emails sent by the local Supabase stack from Mailpit's REST API.
// Mailpit is Supabase's local email-testing tool (started as part of
// `supabase start`) — confirm its port with `npm run supabase:status`; the
// CLI default (used here) is 54324. See
// docs/authentication-implementation.md, "Local Mailpit testing".

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

interface MailpitMessageSummary {
  ID: string;
  To: { Address: string }[];
}

interface MailpitMessagesResponse {
  messages: MailpitMessageSummary[];
}

interface MailpitMessage {
  HTML?: string;
}

/**
 * Snapshots the Mailpit message IDs currently in `toAddress`'s inbox. Call
 * this *before* triggering a second email to an address that has already
 * received one (e.g. before requesting a password-reset for an address
 * that was already used to sign up), then pass the result as
 * `excludeMessageIds` to `waitForConfirmationLink` — see that function's
 * doc comment for why this exists.
 */
export async function listMessageIds(toAddress: string): Promise<Set<string>> {
  const list = (await fetchJson(`${MAILPIT_URL}/api/v1/messages`)) as MailpitMessagesResponse;
  const ids = (list.messages ?? [])
    .filter((message) => message.To?.some((recipient) => recipient.Address === toAddress))
    .map((message) => message.ID);

  return new Set(ids);
}

export interface WaitForConfirmationLinkOptions {
  timeoutMs?: number;
  intervalMs?: number;
  /**
   * Message IDs to ignore when picking a match — from `listMessageIds`,
   * captured before the email being waited for was triggered. Without
   * this, a second email to the same address is indistinguishable from
   * the first: see the root-cause note below.
   */
  excludeMessageIds?: ReadonlySet<string>;
  /**
   * If set, the returned link's `type` query parameter must equal this
   * value (e.g. "recovery" vs "email" — see
   * supabase/templates/{confirmation,recovery}.html). If a new, non-excluded
   * message is found whose link has a different type, this throws instead
   * of returning it — a wrong-flow link is never silently handed back.
   */
  expectedType?: string;
}

/**
 * Polls Mailpit for an email addressed to `toAddress`, then extracts the
 * first `/auth/confirm?...` link from its HTML body — i.e. the link a real
 * user would click from either the signup-confirmation or password-recovery
 * email (supabase/templates/confirmation.html, recovery.html).
 *
 * Root cause this guards against: a test that signs up (sending a
 * signup-confirmation email) and then, later in the same run, triggers a
 * password-reset for the *same* address (sending a second, recovery email)
 * ends up with two messages in one inbox. This function returns as soon as
 * it finds *any* matching message — so on a second call, the very first
 * poll can find the old signup-confirmation message still sitting there
 * and return its (already-consumed) link before the new recovery email has
 * even arrived. Sorting candidates by Mailpit's `Created` timestamp did not
 * fix this (confirmed against a real failing run's trace: the "sorted"
 * function still returned the identical, already-used `type=email` link
 * both times) — sorting only changes which message wins *among those
 * already present*, it doesn't stop a stale message from satisfying the
 * "found a match" check before the real one exists. `excludeMessageIds`
 * fixes this at the source: a message present at snapshot time can never
 * be returned, so the loop is forced to keep polling until a genuinely new
 * message shows up, regardless of timestamp precision or list ordering.
 */
export async function waitForConfirmationLink(
  toAddress: string,
  { timeoutMs = 15_000, intervalMs = 500, excludeMessageIds, expectedType }: WaitForConfirmationLinkOptions = {},
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const list = (await fetchJson(`${MAILPIT_URL}/api/v1/messages`)) as MailpitMessagesResponse;
    const candidates = (list.messages ?? []).filter(
      (message) =>
        message.To?.some((recipient) => recipient.Address === toAddress) &&
        !excludeMessageIds?.has(message.ID),
    );

    for (const candidate of candidates) {
      const full = (await fetchJson(
        `${MAILPIT_URL}/api/v1/message/${candidate.ID}`,
      )) as MailpitMessage;
      const html = full.HTML ?? "";
      const linkMatch = html.match(/href="([^"]*\/auth\/confirm\?[^"]+)"/);

      if (!linkMatch) continue;

      const link = linkMatch[1].replace(/&amp;/g, "&");

      if (expectedType) {
        // Parse with a dummy base — `link` is a path (e.g.
        // "/auth/confirm?...") since redirectUrl.search is stripped before
        // this href is generated; see supabase/templates/*.html.
        const actualType = new URL(link, "http://localhost").searchParams.get("type");

        if (actualType !== expectedType) {
          throw new Error(
            `waitForConfirmationLink: found a new email for ${toAddress}, but its link has ` +
              `type=${actualType ?? "(missing)"}, not the expected type=${expectedType}. This ` +
              `usually means the wrong email was picked up (e.g. a signup-confirmation email ` +
              `mixed up with a password-recovery email) — not a token value, so safe to log.`,
          );
        }
      }

      return link;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `No email arrived for ${toAddress} within ${timeoutMs}ms. Is the local Supabase ` +
      `stack running (\`npm run supabase:start\`)? Is Mailpit reachable at ${MAILPIT_URL}?`,
  );
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Mailpit request failed: ${response.status} ${response.statusText} (${url})`);
  }

  return response.json();
}
