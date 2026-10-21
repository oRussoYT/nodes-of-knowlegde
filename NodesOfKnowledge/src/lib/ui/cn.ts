// Tiny, dependency-free classname joiner: filters falsy values and joins
// with a single space. Deliberately not `clsx`/`tailwind-merge` — this
// project adds no dependency where a few lines already do the job
// correctly, the same reasoning docs/decisions/0002-...md gives for not
// adopting `next-themes`. If a future component genuinely needs
// Tailwind-class-conflict resolution (not just conditional joining),
// adopting `tailwind-merge` at that point is a small, justified addition,
// not a default.
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
