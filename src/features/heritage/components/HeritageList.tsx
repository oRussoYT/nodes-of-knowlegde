import Link from "next/link";

import { Badge } from "@/components/ui/Badge";

import { describeSpan, type HeritageItem } from "../parse";

// A compact list of archive items (on person and institution pages too).
export function HeritageList({ items, showRole = false }: { items: HeritageItem[]; showRole?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i) => {
        const span = describeSpan(i);
        return (
          <li key={i.id} className="rounded-md border border-border-default px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/history/${i.id}`} className="font-medium text-foreground underline underline-offset-2">
                {i.title}
              </Link>
              {i.reviewStatus === "proposed" ? (
                <Badge size="sm" tone="info">
                  Waiting for review
                </Badge>
              ) : i.verificationStatus === "provisional" ? (
                <Badge size="sm" tone="neutral">
                  Provisional
                </Badge>
              ) : null}
              {i.visibility === "community" ? (
                <Badge size="sm" tone="warning">
                  Community material
                </Badge>
              ) : null}
              {i.visibility === "restricted" ? (
                <Badge size="sm" tone="warning">
                  Restricted
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-muted-foreground">
              {i.kindLabel}
              {i.scientificName ? ` · ${i.scientificName}` : ""}
              {span ? ` · ${span}` : ""}
              {i.place ? ` · ${i.place}` : ""}
              {showRole && i.role ? ` · ${i.role}` : ""}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
