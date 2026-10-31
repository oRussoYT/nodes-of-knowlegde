import { NextResponse } from "next/server";

import { coaCsv } from "@/features/support/parse";
import { getSupportDraft } from "@/features/support/read";

// The signed-in person's ties as a CSV for the NSF COA template. Only their
// own draft: the database answers for the caller and nobody else.
export async function GET() {
  const draft = await getSupportDraft();
  if (!draft) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(coaCsv(draft), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="collaborators-and-affiliations-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
