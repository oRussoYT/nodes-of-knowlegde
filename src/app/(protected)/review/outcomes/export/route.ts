import { NextResponse, type NextRequest } from "next/server";

import { outcomesToCsv } from "@/features/outcomes/parse";
import { getOutcomeExport, readOutcomeParams } from "@/features/outcomes/read";

// CSV export of an institution's graduates and where they went (ROTEIRO
// etapa 5). The database decides who may export and audits each export.
export async function GET(request: NextRequest) {
  const { org, filters } = readOutcomeParams((k) => request.nextUrl.searchParams.get(k));
  if (!org) {
    return NextResponse.json({ error: "Choose an institution." }, { status: 400 });
  }
  const rows = await getOutcomeExport(org, filters);
  if (rows === null) {
    return NextResponse.json({ error: "Not allowed or not available." }, { status: 403 });
  }
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(outcomesToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="graduate-outcomes-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
