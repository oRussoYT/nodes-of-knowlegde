import Link from "next/link";

import { Badge } from "@/components/ui/Badge";

import { describeConnection, networkCopy, sourceRecordLabel } from "../copy";
import { describeNetworkProvenance } from "../derive";
import type { ProjectedConnection } from "../types";
import { NetworkConnectionPeriod } from "./NetworkConnectionPeriod";
import { NetworkConnectionProvenance } from "./NetworkConnectionProvenance";

// One projected connection: the connected record (the "who/what" -- a link to
// its canonical page where one exists, honest text where it does not, e.g. an
// event), a deterministic one-sentence explanation of HOW the two records are
// connected, the period (where known), and provenance one gesture away. A
// provisional or disputed connection renders a calm, visible verification Badge
// (never colour alone -- the Badge always carries its text label) so its state
// is legible without the tooltip. The connected record's name is an h4 (under
// the section's h3), so the document outline never skips a level. Server
// Component.
export interface NetworkConnectionEntryProps {
  focalLabel: string;
  connection: ProjectedConnection;
}

export function NetworkConnectionEntry({ focalLabel, connection }: NetworkConnectionEntryProps) {
  const node = connection.node;
  const provenance = describeNetworkProvenance(
    connection.provenance.sourceType,
    connection.provenance.verificationStatus,
  );
  const status = connection.provenance.verificationStatus;
  const showBadge = status === "disputed" || status === "provisional";
  const badgeTone: "danger" | "warning" = status === "disputed" ? "danger" : "warning";
  const explanation = describeConnection(focalLabel, connection);
  const isRoutelessEvent = node.href === null && node.type === "event";

  return (
    <li className="border-l border-border-default pl-4">
      <h4 className="text-base font-medium text-foreground">
        {node.href ? (
          <Link href={node.href} className="underline underline-offset-2">
            {node.label}
          </Link>
        ) : (
          <span>{node.label}</span>
        )}
      </h4>
      {node.secondaryLabel ? (
        <p className="text-xs text-muted-foreground">{node.secondaryLabel}</p>
      ) : null}
      <p className="mt-1 text-sm text-foreground">{explanation}</p>
      {isRoutelessEvent ? (
        <p className="mt-1 text-xs text-muted-foreground">{networkCopy.eventNodeNote}</p>
      ) : null}
      <NetworkConnectionPeriod temporal={connection.temporal} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {showBadge ? (
          <Badge tone={badgeTone} size="sm">
            {provenance.statusLabel}
          </Badge>
        ) : null}
        <NetworkConnectionProvenance
          connectionLabel={node.label}
          sourceRecordLabel={sourceRecordLabel(connection.source.type)}
          sourceLabel={provenance.sourceLabel}
          statusLabel={provenance.statusLabel}
        />
      </div>
    </li>
  );
}
