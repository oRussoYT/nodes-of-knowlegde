import Link from "next/link";

import { SubmitButton } from "@/components/ui/SubmitButton";

import { sendMessageAction } from "../actions";
import { MESSAGE_MAX, type ContactOptions } from "../parse";

// "Get in touch" on a person's page. Never shows an email address: members
// who opted in can be messaged here; otherwise only public paths (ORCID,
// OpenAlex) are offered.
export function ContactPanel({
  personId,
  personName,
  options,
  sent,
  error,
}: {
  personId: string;
  personName: string;
  options: ContactOptions;
  sent: boolean;
  error: string | null;
}) {
  return (
    <section id="contact" aria-labelledby="contact-heading" className="mt-6 rounded-2xl border border-border-default bg-surface px-5 py-5">
      <h2 id="contact-heading" className="text-base font-semibold text-foreground">
        Get in touch
      </h2>

      {options.isSelf ? (
        <p className="mt-2 text-sm text-muted-foreground">
          This is your record. Choose whether other members may message you in{" "}
          <Link href="/profile" className="underline underline-offset-4">
            your profile
          </Link>
          .
        </p>
      ) : options.canMessage ? (
        <form action={sendMessageAction} className="mt-3 space-y-3">
          <input type="hidden" name="personId" value={personId} />
          <label htmlFor="contact-body" className="block text-sm text-muted-foreground">
            Write to {personName}. They will see your name, not your email, and can reply here.
          </label>
          <textarea
            id="contact-body"
            name="body"
            rows={4}
            maxLength={MESSAGE_MAX}
            required
            className="w-full rounded-xl border border-border-default bg-background px-4 py-3 text-[15px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            placeholder="Who you are, and why you are writing."
          />
          <SubmitButton pendingLabel="Sending…">Send message</SubmitButton>
        </form>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {options.hasAccount
            ? `${personName} has an account but does not receive messages here.`
            : `${personName} does not have an account here yet.`}{" "}
          {options.orcidUrl || options.openalexUrl ? "Public places to find them:" : "No public contact path is recorded yet."}
        </p>
      )}

      {!options.isSelf && (options.orcidUrl || options.openalexUrl) ? (
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {options.orcidUrl ? (
            <li>
              <a href={options.orcidUrl} rel="noopener noreferrer" target="_blank" className="inline-flex rounded-full border border-border-default px-3 py-1.5 hover:border-foreground">
                ORCID profile
              </a>
            </li>
          ) : null}
          {options.openalexUrl ? (
            <li>
              <a href={options.openalexUrl} rel="noopener noreferrer" target="_blank" className="inline-flex rounded-full border border-border-default px-3 py-1.5 hover:border-foreground">
                Publications on OpenAlex
              </a>
            </li>
          ) : null}
        </ul>
      ) : null}

      {sent ? (
        <p role="status" className="mt-3 text-sm text-tone-success-fg">
          Message sent. Replies arrive in <Link href="/messages" className="underline underline-offset-4">Messages</Link>.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-tone-danger-fg">
          {error}
        </p>
      ) : null}
    </section>
  );
}
