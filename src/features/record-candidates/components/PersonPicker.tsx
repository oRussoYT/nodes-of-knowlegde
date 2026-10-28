"use client";

import { useState, useTransition } from "react";

import { Input } from "@/components/ui/Input";

import { findPeopleAction } from "../actions";

// Search an existing person by name; the choice fills a hidden field.
// Leaving it empty means "not in the record yet" (the form asks for names).

export function PersonPicker({ name, inputId, excludeId }: { name: string; inputId: string; excludeId?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; displayName: string }[]>([]);
  const [chosen, setChosen] = useState<{ id: string; displayName: string } | null>(null);
  const [pending, start] = useTransition();

  function search(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    start(async () => {
      const found = await findPeopleAction(value);
      setResults(found.filter((p) => p.id !== excludeId));
    });
  }

  if (chosen) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <input type="hidden" name={name} value={chosen.id} />
        <span className="font-medium text-foreground">{chosen.displayName}</span>
        <button type="button" className="underline underline-offset-2 text-muted-foreground" onClick={() => setChosen(null)}>
          change
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Input id={inputId} value={query} onChange={(e) => search(e.target.value)} placeholder="Type at least 2 letters" autoComplete="off" />
      {pending ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
      {results.length > 0 ? (
        <ul className="flex flex-col rounded-md border border-border-default text-sm">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" className="w-full px-3 py-2 text-left hover:bg-surface-sunken" onClick={() => setChosen(p)}>
                {p.displayName}
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 && !pending ? (
        <p className="text-xs text-muted-foreground">No one with this name in the record yet — write the names below.</p>
      ) : null}
    </div>
  );
}
