"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Runs as a Server Action invoked from a <form> POST (see
// src/components/auth/LogoutButton.tsx) — never as a GET link/side effect,
// per docs/authentication-implementation.md.
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
