import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { FormMessage } from "@/components/ui/FormMessage";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Textarea } from "@/components/ui/Textarea";
import { pageTitle } from "@/config/site";
import { removeProfilePhotoAction, saveProfileAction } from "@/features/member-profile/actions";
import { PhotoUploader } from "@/features/member-profile/components/PhotoUploader";
import { LIMITS, PROFILE_VISIBILITIES, VISIBILITY_LABELS, shownName } from "@/features/member-profile/parse";
import { getMyProfile } from "@/features/member-profile/read";

export const metadata: Metadata = {
  title: pageTitle("Your profile"),
};

interface ProfilePageProps {
  searchParams: Promise<{ saved?: string; error?: string }>;
}

// The member's own card: photo, name, headline, place, biography, links.
// What the member says about themselves -- not the person record, which
// stays curated and sourced (Pessoa != conta).
export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const mine = await getMyProfile();
  if (!mine) redirect("/login?returnTo=%2Fprofile");

  const { profile, photoUrl, email, userId } = mine;
  const name = shownName(profile, email);

  return (
    <main id="main-content" tabIndex={-1} className="px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto grid max-w-[76rem] gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* How others see you */}
        <section aria-labelledby="card-heading" className="h-fit rounded-3xl border border-border-default bg-surface p-7 lg:sticky lg:top-8">
          <h2 id="card-heading" className="text-sm font-medium text-muted-foreground">
            How members see you
          </h2>
          <div className="mt-6 flex flex-col items-center text-center">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link to a private photo
              <img src={photoUrl} alt={`Photo of ${name}`} className="size-36 rounded-full object-cover ring-4 ring-nk-lime/70" />
            ) : (
              <Avatar name={name} size="lg" className="size-36 text-4xl" />
            )}
            <p className="mt-5 max-w-full font-display text-3xl font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]">{name}</p>
            {profile.headline ? <p className="mt-2 text-[15px] text-foreground">{profile.headline}</p> : null}
            {profile.location ? <p className="mt-1 text-sm text-muted-foreground">{profile.location}</p> : null}
          </div>
          {profile.biography ? (
            <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-foreground">{profile.biography}</p>
          ) : null}
          {profile.website || profile.orcid ? (
            <ul className="mt-6 space-y-2 text-sm">
              {profile.orcid ? (
                <li>
                  <a className="underline underline-offset-4" href={`https://orcid.org/${profile.orcid}`} rel="noopener noreferrer" target="_blank">
                    ORCID {profile.orcid}
                  </a>
                </li>
              ) : null}
              {profile.website ? (
                <li>
                  <a className="break-all underline underline-offset-4" href={profile.website} rel="noopener noreferrer" target="_blank">
                    {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              ) : null}
            </ul>
          ) : null}
          <p className="mt-6 border-t border-border-default pt-4 text-xs text-muted-foreground">
            Visible to: <strong className="font-medium text-foreground">{VISIBILITY_LABELS[profile.visibility]}</strong>. Never shown to
            people who are not signed in.
          </p>
        </section>

        {/* Edit */}
        <div className="space-y-6">
          <header className="rounded-3xl bg-nk-ink px-7 py-9 text-nk-bone sm:px-10" data-theme="dark">
            <h1 className="font-display text-4xl font-bold leading-none tracking-[-0.03em] sm:text-6xl">Your profile</h1>
            <p className="mt-4 max-w-xl text-[#c3c8b6]">
              Your photo and a few words about you. This is what you say about yourself — your record in the
              project stays sourced and reviewed. See <Link href="/account" className="underline underline-offset-4">Account</Link>{" "}
              for your sign-in details.
            </p>
          </header>

          {params.saved === "1" ? <FormMessage tone="success">Saved.</FormMessage> : null}
          {params.error ? <FormMessage tone="error">{params.error}</FormMessage> : null}

          <section aria-labelledby="photo-heading" className="rounded-3xl border border-border-default bg-surface p-7">
            <h2 id="photo-heading" className="font-display text-2xl font-bold tracking-tight text-foreground">
              Photo
            </h2>
            <div className="mt-5 flex flex-wrap items-start gap-6">
              <PhotoUploader userId={userId} hasPhoto={Boolean(profile.photoPath)} />
              {profile.photoPath ? (
                <form action={removeProfilePhotoAction}>
                  <button type="submit" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                    Remove photo
                  </button>
                </form>
              ) : null}
            </div>
          </section>

          <form action={saveProfileAction} className="space-y-6 rounded-3xl border border-border-default bg-surface p-7">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">About you</h2>

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
              <Textarea id="biography" name="biography" rows={6} defaultValue={profile.biography ?? ""} maxLength={LIMITS.biography} placeholder="Your work, your time in the forest, what you study now." />
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
                  <label key={value} className="flex cursor-pointer items-center gap-2 rounded-full border border-border-default px-4 py-2 text-sm has-[:checked]:border-foreground has-[:checked]:bg-surface-sunken">
                    <input type="radio" name="visibility" value={value} defaultChecked={profile.visibility === value} className="accent-current" />
                    {VISIBILITY_LABELS[value]}
                  </label>
                ))}
              </div>
            </fieldset>

            <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
          </form>
        </div>
      </div>
    </main>
  );
}
