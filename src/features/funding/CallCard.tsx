import { Badge } from "@/components/ui/Badge";

import { daysLeft, matchReasons, type FundingCall } from "./parse";

const SOURCE = { manual: "Added by a steward", grants_gov: "From Grants.gov", ai_page: "Read by AI from the call's page" } as const;

export function CallCard({ call, children }: { call: FundingCall; children?: React.ReactNode }) {
  const left = daysLeft(call.closesOn);
  const reasons = matchReasons(call);
  return (
    <li className="rounded-md border border-border-default px-4 py-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <a href={call.url} target="_blank" rel="noreferrer" className="font-semibold text-foreground underline underline-offset-2">
          {call.title}
        </a>
        <Badge size="sm" tone="neutral">
          {call.scope === "national" ? "National" : "International"}
        </Badge>
        {left !== null && left <= 30 ? (
          <Badge size="sm" tone="warning">
            {left <= 0 ? "Closes today" : `${left} days left`}
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 text-muted-foreground">
        {call.funder}
        {call.closesOn ? ` · deadline ${call.closesOn}` : " · no deadline given"}
        {call.amount ? ` · ${call.amount}` : ""}
      </p>
      {call.summary ? <p className="mt-2 text-foreground">{call.summary}</p> : null}
      {reasons.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-foreground">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : call.themes.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Themes: {call.themes.join(", ")}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">{SOURCE[call.source]} · always check the call&apos;s own page.</p>
      {children}
    </li>
  );
}
