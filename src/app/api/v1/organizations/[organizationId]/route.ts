import { identifierUrls, isUuid } from "@/features/public-api/envelope";
import { anonClient, apiError, apiResponse } from "@/features/public-api/read";

export async function GET(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  if (!isUuid(organizationId)) return apiError("Not found.", 404);
  const { data, error } = await anonClient().rpc("public_api_organization", { p_org: organizationId });
  if (error) return apiError("Not available right now.", 503);
  if (data === null || typeof data !== "object" || Array.isArray(data)) return apiError("Not found.", 404);
  return apiResponse({ ...data, links: identifierUrls(data) }, request.url);
}
