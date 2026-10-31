import { anonClient, apiError, apiResponse } from "@/features/public-api/read";

// Only people whose page was deliberately made public.
export async function GET(request: Request) {
  const { data, error } = await anonClient().rpc("list_public_people");
  if (error) return apiError("Not available right now.", 503);
  const people = (data ?? []).filter((p) => !p.is_demo).map((p) => ({ id: p.id, name: p.display_name }));
  return apiResponse(people, request.url);
}
