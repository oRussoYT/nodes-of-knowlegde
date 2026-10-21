// The Timeline's temporal formatter is the platform-shared Many-Clocks kernel
// (src/features/shared/temporal.ts). Re-exported here so the Timeline's
// historical import path (`@/features/timeline/temporal`) and its unit test
// are unchanged, while the SAME kernel is shared with the Participation Engine
// (M6.3) and every later clock -- one temporal model, never duplicated.

export { formatPoint, formatTemporal } from "@/features/shared/temporal";
export type { TemporalDescriptor, TemporalKind } from "@/features/shared/temporal";
