// A member's own profile card (photo, name, headline, place, bio, links).
// Pure parsing and form validation -- no I/O, unit-tested.
// Database rules live in supabase/migrations/20261023090000_add_member_profiles.sql;
// these checks mirror them so the member sees a clear message first.

export const PROFILE_VISIBILITIES = ["members", "private"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<ProfileVisibility, string> = {
  members: "Signed-in members",
  private: "Only me",
};

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const LIMITS = {
  displayName: 120,
  headline: 160,
  location: 120,
  biography: 2000,
  website: 300,
} as const;

export interface MemberProfile {
  displayName: string | null;
  headline: string | null;
  location: string | null;
  biography: string | null;
  website: string | null;
  orcid: string | null;
  photoPath: string | null;
  visibility: ProfileVisibility;
  updatedAt: string | null;
}

export const EMPTY_PROFILE: MemberProfile = {
  displayName: null,
  headline: null,
  location: null,
  biography: null,
  website: null,
  orcid: null,
  photoPath: null,
  visibility: "members",
  updatedAt: null,
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function isVisibility(value: unknown): value is ProfileVisibility {
  return typeof value === "string" && (PROFILE_VISIBILITIES as readonly string[]).includes(value);
}

/** A member_profiles row (or nothing yet) as the app uses it. */
export function parseProfileRow(row: unknown): MemberProfile {
  if (!row || typeof row !== "object") return EMPTY_PROFILE;
  const r = row as Record<string, unknown>;
  return {
    displayName: text(r.display_name),
    headline: text(r.headline),
    location: text(r.location),
    biography: text(r.biography),
    website: text(r.website),
    orcid: text(r.orcid),
    photoPath: text(r.photo_path),
    visibility: isVisibility(r.visibility) ? r.visibility : "members",
    updatedAt: text(r.updated_at),
  };
}

export interface ProfileFormValues {
  display_name: string | null;
  headline: string | null;
  location: string | null;
  biography: string | null;
  website: string | null;
  orcid: string | null;
  visibility: ProfileVisibility;
}

export type ProfileFormResult = { ok: true; values: ProfileFormValues } | { ok: false; error: string };

const ORCID = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/** Accepts a bare ORCID iD or an orcid.org link; returns the bare iD. */
export function normalizeOrcid(raw: string): string | null {
  const trimmed = raw.trim().replace(/^https?:\/\/(www\.)?orcid\.org\//i, "").replace(/\/$/, "").toUpperCase();
  return ORCID.test(trimmed) ? trimmed : null;
}

/** Adds https:// to a bare address; returns null when it is not a web address. */
export function normalizeWebsite(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "" || /\s/.test(trimmed)) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return withScheme;
  } catch {
    return null;
  }
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Validates the "Edit your profile" form. Empty fields are cleared. */
export function parseProfileForm(form: FormData): ProfileFormResult {
  const displayName = field(form, "displayName");
  const headline = field(form, "headline");
  const location = field(form, "location");
  const biography = field(form, "biography");
  const websiteRaw = field(form, "website");
  const orcidRaw = field(form, "orcid");
  const visibilityRaw = field(form, "visibility");

  if (displayName.length > LIMITS.displayName) return { ok: false, error: "Your name is too long (120 characters at most)." };
  if (headline.length > LIMITS.headline) return { ok: false, error: "The headline is too long (160 characters at most)." };
  if (location.length > LIMITS.location) return { ok: false, error: "The place is too long (120 characters at most)." };
  if (biography.length > LIMITS.biography) return { ok: false, error: "The biography is too long (2,000 characters at most)." };

  let website: string | null = null;
  if (websiteRaw !== "") {
    website = normalizeWebsite(websiteRaw);
    if (!website || website.length > LIMITS.website) return { ok: false, error: "The website must be a web address, like https://example.org." };
  }

  let orcid: string | null = null;
  if (orcidRaw !== "") {
    orcid = normalizeOrcid(orcidRaw);
    if (!orcid) return { ok: false, error: "The ORCID iD should look like 0000-0002-1825-0097." };
  }

  if (!isVisibility(visibilityRaw)) return { ok: false, error: "Choose who can see your profile." };

  return {
    ok: true,
    values: {
      display_name: displayName || null,
      headline: headline || null,
      location: location || null,
      biography: biography || null,
      website,
      orcid,
      visibility: visibilityRaw,
    },
  };
}

/** True when a storage path belongs in this member's own photo folder. */
export function isOwnPhotoPath(path: string, userId: string): boolean {
  const parts = path.split("/");
  return (
    parts.length === 2 &&
    parts[0] === userId &&
    /^[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(parts[1] ?? "") &&
    !path.includes("..")
  );
}

/** Problem with a chosen photo file, or null when it can be uploaded. */
export function photoProblem(file: { type: string; size: number }): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return "Use a JPG, PNG or WebP photo.";
  if (file.size > PHOTO_MAX_BYTES) return "The photo is larger than 5 MB.";
  return null;
}

/** The name to show for the member: their chosen name, else their email. */
export function shownName(profile: MemberProfile, email: string): string {
  return profile.displayName ?? email;
}

export interface ChecklistItem {
  key: "photo" | "name" | "headline" | "location" | "biography" | "links";
  label: string;
  done: boolean;
}

/** What is still missing from the member's own card (never compared with anyone else). */
export function profileChecklist(profile: MemberProfile): ChecklistItem[] {
  return [
    { key: "photo", label: "A photo", done: Boolean(profile.photoPath) },
    { key: "name", label: "Your name", done: Boolean(profile.displayName) },
    { key: "headline", label: "A headline", done: Boolean(profile.headline) },
    { key: "location", label: "Where you are", done: Boolean(profile.location) },
    { key: "biography", label: "A short biography", done: Boolean(profile.biography) },
    { key: "links", label: "ORCID or a website", done: Boolean(profile.orcid || profile.website) },
  ];
}
