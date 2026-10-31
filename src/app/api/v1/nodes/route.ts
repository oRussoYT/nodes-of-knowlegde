import { anonClient, apiError, apiResponse } from "@/features/public-api/read";

export async function GET(request: Request) {
  const { data, error } = await anonClient().rpc("public_api_nodes");
  if (error) return apiError("Not available right now.", 503);
  return apiResponse(data, request.url);
}
