import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import { setLocationAction } from "../actions";
import type { OrganizationLocation } from "../read";

// Where an institution is, with its source; stewards can set it by hand.
export function LocationPanel({
  organizationId,
  location,
  saved,
  error,
}: {
  organizationId: string;
  location: OrganizationLocation;
  saved: boolean;
  error: string | null;
}) {
  const has = location.latitude !== null && location.longitude !== null;
  if (!has && !location.canEdit) return null;
  return (
    <section id="location" aria-labelledby="location-heading">
      <h2 id="location-heading" className="text-sm font-medium text-foreground">
        Where it is
      </h2>
      {has ? (
        <p className="mt-2 text-sm text-foreground">
          {[location.city, location.countryCode].filter(Boolean).join(", ") || "Located"} · {location.latitude!.toFixed(3)}, {location.longitude!.toFixed(3)}{" "}
          <Link href="/map" className="underline underline-offset-2">
            See on the map
          </Link>
          {location.source ? <span className="block text-xs text-muted-foreground">Source: {location.source}</span> : null}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Not on the map yet.</p>
      )}
      {saved ? <p className="mt-2 text-sm text-foreground">Location saved.</p> : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {location.canEdit ? (
        <form action={setLocationAction} className="mt-3 grid gap-3 rounded-md border border-border-default px-4 py-4 sm:grid-cols-4">
          <input type="hidden" name="organizationId" value={organizationId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loc-lat">Latitude</Label>
            <Input id="loc-lat" name="latitude" inputMode="decimal" defaultValue={location.latitude ?? ""} placeholder="-2.40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loc-lon">Longitude</Label>
            <Input id="loc-lon" name="longitude" inputMode="decimal" defaultValue={location.longitude ?? ""} placeholder="-59.90" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loc-city">City or place</Label>
            <Input id="loc-city" name="city" defaultValue={location.city ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loc-country">Country (2 letters)</Label>
            <Input id="loc-country" name="countryCode" maxLength={2} defaultValue={location.countryCode ?? ""} placeholder="BR" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-3">
            <Label htmlFor="loc-source">Source</Label>
            <Input id="loc-source" name="source" defaultValue={location.source ?? ""} placeholder="e.g. Field station map, 1984" />
          </div>
          <div className="flex items-end">
            <Button type="submit" emphasis="secondary" size="sm">
              Save location
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
