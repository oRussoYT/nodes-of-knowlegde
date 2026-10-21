import Image from "next/image";

import { cn } from "@/lib/ui/cn";

export type AvatarSize = "sm" | "md" | "lg";

const SIZE_PX: Record<AvatarSize, number> = { sm: 24, md: 32, lg: 40 };
const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "size-6 text-[0.6875rem]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
};

// A small, fixed set of calm, muted background/foreground token pairs to
// cycle through deterministically by name — variety without being garish,
// per docs/ui-vision.md's "Imagery and iconography principles". Reuses
// already-defined semantic tone tokens rather than inventing a new
// "avatar" color scale.
const PALETTE = [
  { bg: "bg-tone-neutral-bg", fg: "text-tone-neutral-fg" },
  { bg: "bg-tone-info-bg", fg: "text-tone-info-fg" },
  { bg: "bg-tone-success-bg", fg: "text-tone-success-fg" },
  { bg: "bg-tone-warning-bg", fg: "text-tone-warning-fg" },
  { bg: "bg-accent-muted", fg: "text-accent" },
] as const;

function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  // `noUncheckedIndexedAccess` makes this index technically `| undefined`
  // to TypeScript, even though `hash % PALETTE.length` is always in bounds;
  // the `?? PALETTE[0]` fallback satisfies the type checker without ever
  // actually being reached.
  return PALETTE[hash % PALETTE.length] ?? PALETTE[0];
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export interface AvatarProps {
  /** Full name — used both for initials and for the deterministic
   * placeholder color, and as the accessible label when no `src` is given. */
  name: string;
  /** Optional photo. Per docs/ui-vision.md, most historical PDBFF
   * participants never had a photo taken at all — the initials placeholder
   * is the honest default, not a "missing" state to apologize for. */
  src?: string;
  size?: AvatarSize;
  className?: string;
}

// Text-initials placeholder pattern — never a generic silhouette, per
// docs/ui-vision.md: for most of PDBFF's history a photo was never taken,
// not merely "not uploaded yet". Server Component: no interactivity, safe
// to use as the trigger content inside a future client-side Dropdown
// (M5.2) without itself needing a client boundary.
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={SIZE_PX[size]}
        height={SIZE_PX[size]}
        className={cn("rounded-full object-cover", SIZE_CLASSES[size], className)}
      />
    );
  }

  const { bg, fg } = paletteFor(name);

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        bg,
        fg,
        SIZE_CLASSES[size],
        className
      )}
    >
      {initialsFrom(name)}
    </span>
  );
}
