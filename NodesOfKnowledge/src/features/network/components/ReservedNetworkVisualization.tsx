// The visual network map is an HONEST RESERVED SURFACE for M7 (ADR-0017 §8). The
// textual connection list is the complete, canonical view; a node-link diagram
// is at most supplementary and may never carry a fact absent from the text. We
// deliberately ship the full textual network first rather than compromise
// security, provenance, semantic integrity, accessibility, or testability to
// rush a diagram, and we add no large graph-visualization dependency (that would
// require its own ADR). This component names that reserved surface plainly so
// the reader is not misled into thinking a map is missing or broken. Server
// Component.
export function ReservedNetworkVisualization() {
  return (
    <section aria-labelledby="network-visual-heading" className="mt-10">
      <h2 id="network-visual-heading" className="text-sm font-medium text-foreground">
        Visual map
      </h2>
      <div className="mt-2 rounded-md border border-dashed border-border-default bg-surface px-4 py-6">
        <p className="text-sm text-muted-foreground">
          A visual network map is a reserved future surface. The connection list above is the
          complete, canonical view: every documented connection appears there in full, with its
          evidence and dates. When a visual map is added, it will show the same one-hop
          connections and never a fact that is not already in the list — screen distance will not
          measure historical importance, and no record will be sized or ranked by prominence.
        </p>
      </div>
    </section>
  );
}
