import { AppShell } from "@/components/layout/AppShell";
import { PublicHeader } from "@/components/layout/PublicHeader";

// Route group (adds no URL segment) for every public route: `/`, `/login`,
// `/register`, `/forgot-password`, `/auth/error`, `/auth/confirm`. Owns the
// choice to use `PublicHeader` — per ADR-0006, this is a routing-layer
// decision, not something AppShell decides internally by checking session
// state. This layout itself must stay just as static as PublicHeader: no
// `cookies()`, no Supabase call, directly or transitively.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <AppShell header={<PublicHeader />}>{children}</AppShell>;
}
