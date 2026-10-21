// Test fixtures for the Scientific Biography e2e tests, using this repo's
// TWO established privileged seeding paths -- and no others:
//
//   1. The service-role Supabase client (helpers/service-role.ts) for
//      disposable, per-test `people` rows. `people` is granted to
//      service_role by the identity-foundation migration, so this works
//      exactly as helpers/people.ts does.
//
//   2. supabase/seed.sql (superuser, on `supabase db reset`) for a shared,
//      read-only person that carries a curated NARRATIVE. `person_narrative`
//      is deny-by-default and -- by the production security model -- has no
//      service_role table grant, so it deliberately CANNOT be written
//      through the service-role client. The superuser seed is the supported
//      path for narrative test data. Biography reading never mutates the
//      subject, so a single shared seeded row is safe under parallel workers.
//
// This adds no new testing architecture and changes no production security:
// person_narrative remains write-locked to every API role.
//
// Institution-neutral names only, never real or PDBFF-specific identities.

import { getServiceRoleClient } from "./service-role";

type SourceType = "self_reported" | "nominated_by_other" | "admin_entered" | "imported_historical";
type VerificationStatus = "provisional" | "verified_self" | "verified_admin" | "claim_pending" | "disputed";

export interface BiographyPerson {
  id: string;
  displayName: string;
  /** The biography route path for this person. */
  url: string;
}

export interface CreateBiographyPersonOptions {
  verificationStatus?: VerificationStatus;
  sourceType?: SourceType;
  isDeceased?: boolean;
}

// Constants mirroring the seeded narrative person in supabase/seed.sql. Kept
// here so the spec asserts against a single source of truth.
export const SEED_NARRATIVE_DISPLAY_NAME = "Seed Narrative Subject";
export const SEED_NARRATIVE_BODY = "A tropical-forest ecologist, documented from historical records.";

function uniqueToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * A disposable, per-test `people` row (no narrative), created through the
 * service-role client -- `people` is granted to service_role, so this is the
 * same supported path helpers/people.ts uses. Narrative is intentionally not
 * created here; use getSeededNarrativePerson() for a narrative-bearing
 * subject.
 */
export async function createBiographyPerson(options: CreateBiographyPersonOptions = {}): Promise<BiographyPerson> {
  const supabase = getServiceRoleClient();
  const token = uniqueToken();
  const displayName = `Test Subject ${token}`;

  const { data, error } = await supabase
    .from("people")
    .insert({
      given_name: "Test",
      family_name: `Subject ${token}`,
      display_name: displayName,
      is_deceased: options.isDeceased ?? false,
      verification_status: options.verificationStatus ?? "provisional",
      source_type: options.sourceType ?? "imported_historical",
    })
    .select("id, display_name")
    .single();

  if (error) {
    throw new Error(`createBiographyPerson: ${error.message}`);
  }

  return { id: data.id, displayName: data.display_name, url: `/people/${data.id}` };
}

export async function deleteBiographyPerson(id: string): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("people").delete().eq("id", id);
  if (error) {
    throw new Error(`deleteBiographyPerson: ${error.message}`);
  }
}

export interface SeededBiographyPerson extends BiographyPerson {
  narrativeBody: string;
}

/**
 * Looks up the shared, read-only person WITH a curated narrative that
 * supabase/seed.sql creates via the superuser seed. Read through the
 * service-role client (service_role can SELECT `people`); the narrative
 * itself was written by the superuser seed, never by a client. Not
 * disposable -- callers must NOT delete it.
 */
export async function getSeededNarrativePerson(): Promise<SeededBiographyPerson> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, display_name")
    .eq("display_name", SEED_NARRATIVE_DISPLAY_NAME)
    .single();

  if (error || !data) {
    throw new Error(
      `getSeededNarrativePerson: could not find the seeded narrative person ` +
        `("${SEED_NARRATIVE_DISPLAY_NAME}"). Ensure supabase/seed.sql loaded ` +
        `(run: npm run supabase:reset). ${error?.message ?? ""}`,
    );
  }

  return {
    id: data.id,
    displayName: data.display_name,
    url: `/people/${data.id}`,
    narrativeBody: SEED_NARRATIVE_BODY,
  };
}
