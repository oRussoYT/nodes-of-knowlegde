"use server";

// The graduate's answer. No account needed: the link is the permission. The
// database checks the link, accepts one answer, and audits it.

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { isPlausibleToken } from "./parse";

export async function respondConfirmationAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const response = String(formData.get("response") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!isPlausibleToken(token)) redirect("/");
  const path = `/confirm/${token}`;

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_confirmation", {
    p_token: token,
    p_response: response,
    ...(note ? { p_note: note } : {}),
  });
  if (error) {
    const raw = error.message ?? "";
    const message = raw.includes("tell us what is wrong")
      ? "Please tell us what is wrong, in a few words."
      : raw.includes("already used")
        ? "This link has already been used. Thank you."
        : raw.includes("too long")
          ? "Please keep the note under 2,000 characters."
          : "This link is not valid any more.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  redirect(`${path}?done=1`);
}
