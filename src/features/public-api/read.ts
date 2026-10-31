// A client with no session at all: the public API answers exactly what an
// anonymous visitor may see, whoever calls it.

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

import { API_HEADERS, envelope } from "./envelope";

export function anonClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient<Database>(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function siteUrl(requestUrl: string): string {
  return new URL(requestUrl).origin;
}

export function apiResponse(data: unknown, requestUrl: string, status = 200): NextResponse {
  return new NextResponse(JSON.stringify(envelope(data, siteUrl(requestUrl)), null, 2), { status, headers: API_HEADERS });
}

export function apiError(message: string, status: number): NextResponse {
  return new NextResponse(JSON.stringify({ error: message }), { status, headers: API_HEADERS });
}
