import { isUuid } from "@/features/public-api/envelope";
import { anonClient, apiError, apiResponse } from "@/features/public-api/read";

export async function GET(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  if (!isUuid(personId)) return apiError("Not found.", 404);
  const { data, error } = await anonClient().rpc("get_public_person", { p_person_id: personId });
  if (error) return apiError("Not available right now.", 503);
  if (data === null) return apiError("Not found.", 404);
  return apiResponse(data, request.url);
}
