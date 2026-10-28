import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { pageTitle } from "@/config/site";
import { getInstitutionsIndex } from "@/features/directory/read";
import { proposeHeritageAction } from "@/features/heritage/actions";
import { HeritageFileInput } from "@/features/heritage/components/HeritageFileInput";
import { PeoplePicker } from "@/features/heritage/components/PeoplePicker";
import { getHeritageKinds } from "@/features/heritage/read";
import { getCareOptions } from "@/features/privacy/read";
import { getMyUserId } from "@/features/record-candidates/read";

export const metadata: Metadata = {
  title: pageTitle("Add to the history"),
};

export default async function NewHeritagePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const error = typeof raw.error === "string" ? raw.error : null;
  const [kinds, institutions, userId, care] = await Promise.all([getHeritageKinds(), getInstitutionsIndex(), getMyUserId(), getCareOptions()]);
  const preset = typeof raw.kind === "string" && kinds.some((k) => k.key === raw.kind) ? raw.kind : "";

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Add to the history"
          description="A steward checks each addition. Until then it is shown only to you, marked “waiting for review”; after, it is provisional until confirmed."
          action={
            <Link href="/history" className="text-sm underline underline-offset-2">
              History
            </Link>
          }
        />
        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}

        <form action={proposeHeritageAction} className="mt-8 grid gap-4 rounded-md border border-border-default px-4 py-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kind">What is it</Label>
            <Select id="kind" name="kind" required defaultValue={preset}>
              <option value="" disabled>
                Choose one
              </option>
              {kinds.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required maxLength={300} placeholder="e.g. Camp 41 kitchen, 1987" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="summary">Description (optional)</Label>
            <Textarea id="summary" name="summary" rows={4} maxLength={5000} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scientificName">Scientific name (species only)</Label>
            <Input id="scientificName" name="scientificName" maxLength={200} placeholder="e.g. Pithecia chrysocephala" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="organizationId">Institution or station (optional)</Label>
            <Select id="organizationId" name="organizationId" defaultValue="">
              <option value="">None</option>
              {institutions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startYear">From (year)</Label>
            <Input id="startYear" name="startYear" inputMode="numeric" pattern="\d{4}" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="endYear">Until (year)</Label>
            <Input id="endYear" name="endYear" inputMode="numeric" pattern="\d{4}" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
            <input type="checkbox" name="isOngoing" /> Still going
          </label>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="place">Place (optional)</Label>
            <Input id="place" name="place" maxLength={300} placeholder="e.g. Reserva 1501, ZF-3 road" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="latitude">Latitude (optional)</Label>
            <Input id="latitude" name="latitude" inputMode="decimal" placeholder="-2.40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="longitude">Longitude (optional)</Label>
            <Input id="longitude" name="longitude" inputMode="decimal" placeholder="-59.90" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="people-search">People in it (optional)</Label>
            <PeoplePicker inputId="people-search" />
            <Input id="personRole" name="personRole" maxLength={120} aria-label="Their role" placeholder="Their role, e.g. pictured, interviewed, member of the expedition" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="file">File (optional — photo, scan, PDF or recording, up to 50 MB)</Label>
            {userId ? <HeritageFileInput userId={userId} inputId="file" /> : null}
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="externalUrl">Link (optional)</Label>
            <Input id="externalUrl" name="externalUrl" placeholder="https://" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="sourceNote">What documents it</Label>
            <Input id="sourceNote" name="sourceNote" required maxLength={1000} placeholder="e.g. INPA archive, box 12 · personal album · recorded in 2019" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="visibility">Who can see it</Label>
            <Select id="visibility" name="visibility" defaultValue="members">
              <option value="members">Every member</option>
              <option value="restricted">Sensitive — stewards only (and me)</option>
              <option value="community">Community material — only that community&apos;s stewards decide</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="communityOrganizationId">Community (for community material)</Label>
            <Select id="communityOrganizationId" name="communityOrganizationId" defaultValue="">
              <option value="">None</option>
              {care.communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-foreground">Labels from the community (optional, Local Contexts TK/BC)</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {care.labels.map((l) => (
                <label key={l.key} className="flex items-start gap-2 text-sm text-foreground">
                  <input type="checkbox" name="careLabel" value={l.key} className="mt-0.5" />
                  <span>
                    {l.label} <span className="block text-xs text-muted-foreground">{l.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-2">
            <Button type="submit">Send</Button>
          </div>
        </form>
      </Container>
    </main>
  );
}
