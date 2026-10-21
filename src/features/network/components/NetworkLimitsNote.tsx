import { networkCopy } from "../copy";

// "Limits of this view": the honest statement that the network shows DOCUMENTED
// connections, not the totality of scientific history, and that absence is never
// proof no connection exists. Always rendered (even for a rich neighbourhood),
// so the archive never looks more complete than it is. Server Component.
export function NetworkLimitsNote() {
  return (
    <section aria-labelledby="network-limits-heading" className="mt-10">
      <h2 id="network-limits-heading" className="text-sm font-medium text-foreground">
        {networkCopy.limitsHeading}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{networkCopy.limits}</p>
    </section>
  );
}
