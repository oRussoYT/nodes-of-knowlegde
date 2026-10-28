import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormMessage } from "@/components/ui/FormMessage";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Textarea } from "@/components/ui/Textarea";
import { pageTitle } from "@/config/site";
import { removeProfilePhotoAction, saveProfileAction } from "@/features/member-profile/actions";
import { AccessSection } from "@/features/member-profile/components/AccessSection";
import { PhotoUploader } from "@/features/member-profile/components/PhotoUploader";
import {
  LIMITS,
  PROFILE_VISIBILITIES,
  VISIBILITY_LABELS,
  profileChecklist,
  shownName,
} from "@/features/member-profile/parse";
import { getMyProfile } from "@/features/member-profile/read";
import { PrivacySection } from "@/features/privacy/PrivacySection";
import { getPersonPrivacy } from "@/features/privacy/read";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: pageTitle("Your profile"),
};

interface ProfilePageProps {
  searchParams: Promise<{ saved?: string; error?: string; privacySaved?: string; privacyError?: string }>;
}

function initials(name: string): string {
  const base = name.includes("@") ? name.split("@")[0]!.replace(/[._-]+/g, " ") : name;
  const parts = base.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

// The member's own card: photo, name, headline, place, biography, links.
// What the member says about themselves -- not the person record, which
// stays curated and sourced (Pessoa != conta).
export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const mine = await getMyProfile();
  if (!mine) redirect("/login?returnTo=%2Fprofile");

  const { profile, photoUrl, email, userId } = mine;
  const supabase = await createClient();
  const { data: myPerson } = await supabase.rpc("my_linked_person");
  const privacy = typeof myPerson === "string" ? await getPersonPrivacy(myPerson) : null;
  const name = shownName(profile, email);
  const checklist = profileChecklist(profile);
  const done = checklist.filter((item) => item.done).length;

  return (
    <main id="main-content" tabIndex={-1} className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-[76rem]">
        {/* Cover + identity, the way other members see the card. */}
        <section aria-labelledby="profile-name" className="overflow-hidden rounded-3xl border border-border-default bg-surface">
          <div className="relative h-40 sm:h-56">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative cover, already compressed (public/photos) */}
            <img
              src="/photos/canopy-1920.jpg"
              srcSet="/photos/canopy-960.jpg 960w, /photos/canopy-1920.jpg 1920w"
              sizes="(min-width: 1280px) 76rem, 100vw"
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <p className="absolute right-5 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              Visible to: {VISIBILITY_LABELS[profile.visibility]}
            </p>
          </div>

          <div className="relative px-6 pb-7 sm:px-10">
            <div className="-mt-16 flex flex-col gap-5 sm:-mt-20 sm:flex-row sm:items-end">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link to a private photo
                <img
                  src={photoUrl}
                  alt={`Photo of ${name}`}
                  className="size-32 shrink-0 rounded-full object-cover ring-[6px] ring-surface sm:size-40"
                />
              ) : (
                <span
                  role="img"
                  aria-label={name}
                  className="flex size-32 shrink-0 items-center justify-center rounded-full bg-nk-lime font-display text-4xl font-bold text-nk-ink ring-[6px] ring-surface sm:size-40 sm:text-5xl"
                >
                  {initials(name)}
                </span>
              )}
              <div className="min-w-0 flex-1 sm:pb-2">
                <h1
                  id="profile-name"
                  className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-5xl"
                >
                  {profile.displayName ?? "Your profile"}
                </h1>
                <p className="mt-1 text-[15px] text-muted-foreground [overflow-wrap:anywhere]">
                  {[profile.headline, profile.location].filter(Boolean).join(" · ") || email}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:pb-2">
                <PhotoUploader userId={userId} hasPhoto={Boolean(profile.photoPath)} />
                {profile.photoPath ? (
                  <form action={removeProfilePhotoAction}>
                    <button type="submit" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                      Remove photo
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            {profile.biography || profile.orcid || profile.website ? (
              <div className="mt-6 grid gap-6 border-t border-border-default pt-6 md:grid-cols-[minmax(0,1fr)_16rem]">
                {profile.biography ? (
                  <p className="max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-foreground">{profile.biography}</p>
                ) : (
                  <span />
                )}
                <ul className="flex flex-wrap content-start gap-2 text-sm md:flex-col md:items-start">
                  {profile.orcid ? (
                    <li>
                      <a
                        className="inline-flex rounded-full border border-border-default px-3 py-1.5 hover:border-foreground"
                        href={`https://orcid.org/${profile.orcid}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        ORCID {profile.orcid}
                      </a>
                    </li>
                  ) : null}
                  {profile.website ? (
                    <li>
                      <a
                        className="inline-flex max-w-full break-all rounded-full border border-border-default px-3 py-1.5 hover:border-foreground"
                        href={profile.website}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {profile.website.replace(/^https?:\/\//, "")}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        <div className="mt-4 space-y-4">
          {params.saved === "1" ? <FormMessage tone="success">Saved.</FormMessage> : null}
          {params.error ? <FormMessage tone="error">{params.error}</FormMessage> : null}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form action={saveProfileAction} className="space-y-6 rounded-3xl border border-border-default bg-surface p-6 sm:p-8">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Edit your profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                What you say about yourself. Your record in the project stays sourced and reviewed. Your email and
                password are in <a href="#access" className="underline underline-offset-4">Access and security</a>, below.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Name</Label>
                <Input id="displayName" name="displayName" defaultValue={profile.displayName ?? ""} maxLength={LIMITS.displayName} autoComplete="name" placeholder="How you want to be called" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Where you are</Label>
                <Input id="location" name="location" defaultValue={profile.location ?? ""} maxLength={LIMITS.location} placeholder="City, country" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" name="headline" defaultValue={profile.headline ?? ""} maxLength={LIMITS.headline} placeholder="e.g. PhD student in ecology, McGill University" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="biography">Short biography</Label>
              <Textarea id="biography" name="biography" rows={5} defaultValue={profile.biography ?? ""} maxLength={LIMITS.biography} placeholder="Your work, your time in the forest, what you study now." />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orcid">ORCID iD</Label>
                <Input id="orcid" name="orcid" defaultValue={profile.orcid ?? ""} placeholder="0000-0002-1825-0097" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" type="text" inputMode="url" defaultValue={profile.website ?? ""} maxLength={LIMITS.website} placeholder="https://…" />
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">Who can see your profile</legend>
              <div className="flex flex-wrap gap-3">
                {PROFILE_VISIBILITIES.map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-border-default px-4 py-2 text-sm has-[:checked]:border-foreground has-[:checked]:bg-surface-sunken"
                  >
                    <input type="radio" name="visibility" value={value} defaultChecked={profile.visibility === value} className="accent-current" />
                    {VISIBILITY_LABELS[value]}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Never shown to people who are not signed in.</p>
            </fieldset>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border-default p-4 text-sm has-[:checked]:border-foreground">
              <input type="checkbox" name="acceptsMessages" defaultChecked={profile.acceptsMessages} className="mt-0.5 size-4 accent-current" />
              <span>
                <span className="block font-medium text-foreground">Let other members send me messages</span>
                <span className="mt-0.5 block text-muted-foreground">
                  They see your name, never your email. Works once your account is linked to your record. You can turn it off any time.
                </span>
              </span>
            </label>

            <div className="flex justify-end">
              <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
            </div>
          </form>

          {/* What is still missing -- only about this member's own card. */}
          <aside aria-labelledby="checklist-heading" className="h-fit rounded-3xl border border-border-default bg-surface p-6 lg:sticky lg:top-8">
            <h2 id="checklist-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
              Your card
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {done === checklist.length ? "Complete." : `${done} of ${checklist.length} filled in.`}
            </p>
            <div aria-hidden="true" className="mt-4 h-2 overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full rounded-full bg-nk-lime" style={{ width: `${Math.round((done / checklist.length) * 100)}%` }} />
            </div>
            <ul className="mt-5 space-y-2.5 text-sm">
              {checklist.map((item) => (
                <li key={item.key} className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={
                      item.done
                        ? "flex size-5 items-center justify-center rounded-full bg-nk-lime text-[11px] font-bold text-nk-ink"
                        : "size-5 rounded-full border-2 border-border-default"
                    }
                  >
                    {item.done ? "✓" : null}
                  </span>
                  <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                    {item.label}
                    <span className="sr-only">{item.done ? " (done)" : " (missing)"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <PrivacySection
          linked={privacy !== null}
          limitRevelations={privacy?.limitRevelations ?? false}
          saved={params.privacySaved === "1"}
          error={params.privacyError ?? null}
        />

        <AccessSection />
      </div>
    </main>
  );
}
