import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isDevOnlyRouteBlocked } from "@/lib/dev-only-route";

import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Container } from "@/components/ui/Container";
import { Divider } from "@/components/ui/Divider";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldError } from "@/components/ui/FieldError";
import { FormField } from "@/components/ui/FormField";
import { FormMessage } from "@/components/ui/FormMessage";
import { Grid } from "@/components/ui/Grid";
import { HelperText } from "@/components/ui/HelperText";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Radio } from "@/components/ui/Radio";
import { Section } from "@/components/ui/Section";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { Stack } from "@/components/ui/Stack";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Surface } from "@/components/ui/Surface";
import { Textarea } from "@/components/ui/Textarea";

import { InteractivePrimitivesDemo } from "./InteractivePrimitivesDemo";
import { ThemeToggleDemo } from "./ThemeToggleDemo";

// Internal-only, development-time verification aid for M5.1 (Design
// Foundations) — exercises every token and every component built so far,
// in one place, in both themes. Per
// docs/m5-application-ui-design-system.md item 13: "A living style-guide
// route ... is optional and, if built, must be excluded from production
// routing/navigation ... it is a development aid, not a product feature,
// and must not become a public route."
//
// Precise production behavior — three genuinely different properties, not
// interchangeable, and worth stating exactly rather than loosely claiming
// "excluded":
//   1. NOT LINKED — true, always has been. No real page, nav, or sitemap
//      references this route anywhere.
//   2. RUNTIME-BLOCKED — true. `isDevOnlyRouteBlocked()` below returns
//      `true` for anything other than `NODE_ENV=development`, and this
//      component calls `notFound()` in that case, which renders Next's real
//      not-found boundary and returns an actual 404 status — not a
//      client-side-hidden page that still ships its content.
//
//      Verifying this requires real Supabase env vars, even though this
//      page itself never touches Supabase: `src/proxy.ts` runs on nearly
//      every request (its matcher covers this route too) and calls
//      `updateSession()` → `getSupabaseEnv()`
//      (`src/lib/supabase/env.ts`), whose `required()` helper *throws* in
//      production if `NEXT_PUBLIC_SUPABASE_URL`/
//      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are unset — pre-existing M4
//      auth infrastructure, unrelated to and untouched by M5.1. Without
//      those set, `npm run start` fails for every route, not just this
//      one, before any page (including this one's `notFound()`) is ever
//      reached — that's a global startup failure, not evidence about this
//      route's own behavior, and must not be misread as one. Verify with:
//        npm run supabase:start
//        npm run supabase:status   # note the API URL + publishable key
//        NEXT_PUBLIC_SUPABASE_URL=<url> NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<key> npm run build
//        NEXT_PUBLIC_SUPABASE_URL=<url> NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<key> npm run start
//        curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dev/design-system
//      must print `404`. (Local Supabase's URL/key are fixed, well-known
//      values printed by `supabase status`/`supabase start` — not secrets.)
//   3. ABSENT FROM THE PRODUCTION ROUTE MANIFEST — false. `npm run build`
//      still lists `○ /dev/design-system` in its output. Next.js's
//      file-system router determines routes from what's on disk at build
//      time; there is no supported App Router mechanism to conditionally
//      omit an existing route file from the manifest based on an env var
//      read *inside* the page — only *not having the file present* during
//      that specific build would achieve that (e.g. a prebuild step that
//      moves `src/app/dev` out of the tree for production builds only).
//      That's a build-pipeline change, not a presentation-layer one, and
//      wasn't made here — this is a documented, deliberate limitation of
//      the chosen approach, not an oversight. `docs/m5-application-ui-design-system.md`
//      item 13 explicitly accepts "gated behind a build-time flag" as
//      sufficient without requiring manifest absence.
export const metadata: Metadata = {
  title: "M5.1 design system (dev only)",
  // Defense in depth beyond notFound(): even though the route is
  // runtime-blocked in production, it still exists in the manifest (see
  // above) — this keeps a search engine from ever indexing it if that
  // 404-status enforcement were ever bypassed or misconfigured.
  robots: { index: false, follow: false },
};

const COLOR_SWATCHES: Array<{ label: string; bg: string; fg: string }> = [
  { label: "background / foreground", bg: "bg-background", fg: "text-foreground" },
  { label: "surface", bg: "bg-surface", fg: "text-foreground" },
  { label: "surface-raised", bg: "bg-surface-raised", fg: "text-foreground" },
  { label: "surface-sunken", bg: "bg-surface-sunken", fg: "text-foreground" },
  { label: "accent", bg: "bg-accent", fg: "text-accent-foreground" },
  { label: "accent-muted", bg: "bg-accent-muted", fg: "text-accent" },
  { label: "destructive", bg: "bg-destructive", fg: "text-destructive-foreground" },
];

const TONES = ["neutral", "success", "warning", "danger", "info"] as const;

// Tailwind statically scans source for literal class-name strings — a
// template-literal-interpolated class (e.g. `bg-status-${x}-bg`) would
// silently fail to generate, so every status token's classes are spelled
// out literally here rather than built from the status name at runtime.
const STATUS_SWATCHES = [
  { label: "unreviewed", classes: "bg-status-unreviewed-bg text-status-unreviewed-fg border-status-unreviewed-border" },
  { label: "under-review", classes: "bg-status-under-review-bg text-status-under-review-fg border-status-under-review-border" },
  { label: "provisional", classes: "bg-status-provisional-bg text-status-provisional-fg border-status-provisional-border" },
  { label: "supported", classes: "bg-status-supported-bg text-status-supported-fg border-status-supported-border" },
  { label: "confirmed", classes: "bg-status-confirmed-bg text-status-confirmed-fg border-status-confirmed-border" },
  { label: "disputed", classes: "bg-status-disputed-bg text-status-disputed-fg border-status-disputed-border" },
  { label: "rejected", classes: "bg-status-rejected-bg text-status-rejected-fg border-status-rejected-border" },
] as const;

export default function DesignSystemDevPage() {
  if (isDevOnlyRouteBlocked(process.env.NODE_ENV)) {
    notFound();
  }

  return (
    <Container width="shell">
      <Section spacing="lg">
        <PageHeader
          title="M5.1 — Design Foundations (dev verification)"
          description="Internal only. Not linked; returns a real 404 unless NODE_ENV=development. Every token and every component built so far, for manual review in both themes."
          action={<ThemeToggleDemo />}
        />
      </Section>

      <Section spacing="sm">
        <p className="text-sm text-muted-foreground">
          Related dev route:{" "}
          <Link
            href="/dev/exhibition"
            className="font-medium text-foreground underline underline-offset-2"
          >
            M6 system exhibition
          </Link>{" "}
          — a development-only tour of every completed M6 engine, built from a fictional world.
        </p>
      </Section>

      <Section spacing="md">
        <h2 className="text-lg font-semibold text-foreground">Color — surfaces &amp; accent</h2>
        <Grid cols={3} className="mt-4">
          {COLOR_SWATCHES.map((s) => (
            <Surface key={s.label} bordered rounded elevation="sm" className="p-4">
              <div className={`flex h-12 items-center justify-center rounded-md ${s.bg} ${s.fg} text-xs`}>
                {s.label}
              </div>
            </Surface>
          ))}
        </Grid>
      </Section>

      <Section spacing="md">
        <h2 className="text-lg font-semibold text-foreground">Color — tones (Alert / Badge / FormMessage)</h2>
        <Stack gap="sm" className="mt-4">
          {TONES.map((tone) => (
            <Alert key={tone} tone={tone} title={`tone="${tone}"`}>
              Sample alert body text for the {tone} tone.
            </Alert>
          ))}
        </Stack>
        <Stack direction="row" gap="sm" wrap className="mt-4">
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </Stack>
      </Section>

      <Section spacing="md">
        <h2 className="text-lg font-semibold text-foreground">
          Color — verification-status vocabulary (defined, unused until domain data exists)
        </h2>
        <Grid cols={4} className="mt-4">
          {STATUS_SWATCHES.map((s) => (
            <div key={s.label} className={`rounded-md border px-3 py-2 text-xs ${s.classes}`}>
              status-{s.label}
            </div>
          ))}
        </Grid>
      </Section>

      <Section spacing="md">
        <h2 className="text-lg font-semibold text-foreground">Typography scale</h2>
        <Stack gap="xs" className="mt-4">
          <p className="text-xs text-foreground">text-xs — metadata, timestamps, field hints</p>
          <p className="text-sm text-foreground">text-sm — body copy in dense contexts, labels</p>
          <p className="text-base text-foreground">text-base — default reading body copy</p>
          <p className="text-lg text-foreground">text-lg — section headers</p>
          <p className="text-2xl font-semibold text-foreground">text-2xl — page headers</p>
        </Stack>
      </Section>

      <Section spacing="md">
        <h2 className="text-lg font-semibold text-foreground">Layout primitives</h2>
        <Stack gap="sm" className="mt-4">
          <Surface bordered rounded className="p-3 text-sm">Surface (level=&quot;surface&quot;)</Surface>
          <Stack direction="row" gap="sm">
            <Surface bordered rounded className="flex-1 p-3 text-sm">Stack item A</Surface>
            <Surface bordered rounded className="flex-1 p-3 text-sm">Stack item B</Surface>
          </Stack>
          <Divider />
          <Divider label="or" />
        </Stack>
      </Section>

      <Section spacing="md">
        <h2 className="text-lg font-semibold text-foreground">Buttons</h2>
        <Stack direction="row" gap="sm" wrap className="mt-4">
          <Button emphasis="primary">Primary</Button>
          <Button emphasis="secondary">Secondary</Button>
          <Button emphasis="ghost">Ghost</Button>
          <Button emphasis="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
        </Stack>
        <Stack direction="row" gap="sm" wrap className="mt-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Stack>
        <form className="mt-4 max-w-(--container-form)">
          <SubmitButton>SubmitButton (form-status driven)</SubmitButton>
        </form>
      </Section>

      <Section spacing="md">
        <h2 className="text-lg font-semibold text-foreground">Card / Avatar / EmptyState</h2>
        <Grid cols={3} className="mt-4">
          <Card>
            <p className="text-sm font-medium">Card title</p>
            <p className="mt-1 text-sm text-muted-foreground">Card body text.</p>
          </Card>
          <Card>
            <Stack direction="row" gap="sm" align="center">
              <Avatar name="Maria Silva" />
              <Avatar name="José Ferreira" />
              <Avatar name="Ana" size="lg" />
            </Stack>
          </Card>
          <EmptyState title="Not yet connected" description="Honest empty state — no fabricated data." />
        </Grid>
      </Section>

      <Section spacing="md">
        <h2 className="text-lg font-semibold text-foreground">Skeleton / Spinner</h2>
        <Stack gap="sm" className="mt-4">
          <Skeleton variant="text" className="w-48" />
          <Skeleton variant="block" className="h-16 w-full" />
          <Stack direction="row" gap="sm" align="center">
            <Avatar name="?" />
            <Skeleton variant="circle" className="size-8" />
          </Stack>
          <Spinner label="Loading" showLabel />
        </Stack>
      </Section>

      <Section spacing="md">
        <h2 className="text-lg font-semibold text-foreground">Form primitives</h2>
        <Stack gap="md" className="mt-4 max-w-(--container-form)">
          <FormField label="Email (FormField — refactored in place)" name="dev-email" type="email" hint="Existing M4 API, unchanged." />
          <FormField label="With error" name="dev-error" error="This field has an error." />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dev-textarea">Textarea</Label>
            <Textarea id="dev-textarea" placeholder="Standalone Textarea primitive" />
            <HelperText>Composed directly with Label + HelperText, not via FormField.</HelperText>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dev-select">Select</Label>
            <Select id="dev-select" defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              <option value="a">Option A</option>
              <option value="b">Option B</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dev-invalid">Invalid select</Label>
            <Select id="dev-invalid" invalid defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
            </Select>
            <FieldError>Standalone FieldError example.</FieldError>
          </div>

          <Checkbox id="dev-checkbox" label="Checkbox with inline label" />
          <Stack direction="row" gap="md">
            <Radio id="dev-radio-1" name="dev-radio" label="Option 1" />
            <Radio id="dev-radio-2" name="dev-radio" label="Option 2" />
          </Stack>

          <FormMessage tone="warning">FormMessage — new &quot;warning&quot; tone.</FormMessage>
          <FormMessage tone="neutral">FormMessage — new &quot;neutral&quot; tone.</FormMessage>
        </Stack>
      </Section>

      <Section spacing="md">
        <h2 className="text-lg font-semibold text-foreground">Radix-backed interactive primitives</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dialog, Drawer, Dropdown, Tooltip, Tabs — per ADR-0003. Not wired into any real page yet (shells/pages are
          M5.2 scope). Keyboard-test each: Tab to the trigger, Enter/Space to open, Escape to close, focus returns
          to the trigger.
        </p>
        <div className="mt-4">
          <InteractivePrimitivesDemo />
        </div>
      </Section>
    </Container>
  );
}
