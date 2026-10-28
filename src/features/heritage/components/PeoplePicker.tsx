"use client";

import { useState, useTransition } from "react";

import { Input } from "@/components/ui/Input";
import { findPeopleAction } from "@/features/record-candidates/actions";

// Several people from the record; each choice adds a hidden personId field.
export function PeoplePicker({ inputId }: { inputId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; displayName: string }[]>([]);
  const [chosen, setChosen] = useState<{ id: string; displayName: string }[]>([]);
  const [pending, start] = useTransition();

  function search(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    start(async () => setResults(await findPeopleAction(value)));
  }

  return (
    <div className="flex flex-col gap-2">
      {chosen.length > 0 ? (
        <ul className="flex flex-wrap gap-2 text-sm">
          {chosen.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-full border border-border-default px-3 py-1">
              <input type="hidden" name="personId" value={p.id} />
              {p.displayName}
              <button type="button" aria-label={`Remove ${p.displayName}`} onClick={() => setChosen((c) => c.filter((x) => x.id !== p.id))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input id={inputId} value={query} onChange={(e) => search(e.target.value)} placeholder="Type at least 2 letters" autoComplete="off" />
      {pending ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
      {results.length > 0 ? (
        <ul className="flex flex-col rounded-md border border-border-default text-sm">
          {results
            .filter((r) => !chosen.some((c) => c.id === r.id))
            .map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-surface-sunken"
                  onClick={() => {
                    setChosen((c) => [...c, p]);
                    setQuery("");
                    setResults([]);
                  }}
                >
                  {p.displayName}
                </button>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}
