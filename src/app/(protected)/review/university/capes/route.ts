import { NextResponse, type NextRequest } from "next/server";

import { readOutcomeParams } from "@/features/outcomes/parse";
import { capesToCsv } from "@/features/university/parse";
import { getCapesExport } from "@/features/university/read";

// CAPES "destino de egressos" CSV: master's and doctoral graduates and where
// they went, with source. The database decides who may export and audits it.
export async function GET(request: NextRequest) {
  const { org, filters } = readOutcomeParams((k) => request.nextUrl.searchParams.get(k));
  if (!org) return NextResponse.json({ error: "Choose an institution." }, { status: 400 });
  const rows = await getCapesExport(org, filters);
  if (rows === null) return NextResponse.json({ error: "Not allowed or not available." }, { status: 403 });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(capesToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="capes-egressos-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
