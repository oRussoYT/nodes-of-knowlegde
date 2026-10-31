import { apiIndex } from "@/features/public-api/envelope";
import { apiResponse, siteUrl } from "@/features/public-api/read";

// The public API's front door: what it offers.
export async function GET(request: Request) {
  return apiResponse(apiIndex(`${siteUrl(request.url)}/api/v1`), request.url);
}
