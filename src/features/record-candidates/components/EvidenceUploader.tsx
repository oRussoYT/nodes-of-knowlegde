"use client";

import { useState, type ChangeEvent } from "react";

import { createClient } from "@/lib/supabase/client";

import { evidenceProblem } from "../parse";

// Uploads files to the member's own folder of the private 'evidence' bucket
// and adds a hidden evidencePath field per file to the surrounding form.
// Only the proposer and stewards can open them.

export function EvidenceUploader({ userId, inputId }: { userId: string; inputId: string }) {
  const [files, setFiles] = useState<{ path: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (chosen.length === 0) return;
    if (files.length + chosen.length > 10) {
      setMessage("Attach at most 10 files.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const added: { path: string; name: string }[] = [];
    for (const file of chosen) {
      const problem = evidenceProblem(file);
      if (problem) {
        setMessage(`${file.name}: ${problem}`);
        continue;
      }
      const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
      const path = `${userId}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("evidence").upload(path, file, { contentType: file.type, upsert: false });
      if (error) setMessage(`${file.name}: could not be uploaded. Please try again.`);
      else added.push({ path, name: file.name });
    }
    setFiles((f) => [...f, ...added]);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        id={inputId}
        type="file"
        multiple
        accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,text/xml,application/xml"
        onChange={onChange}
        disabled={busy}
        className="text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border-default file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
      />
      {busy ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
      {message ? (
        <p role="alert" className="text-xs text-destructive">
          {message}
        </p>
      ) : null}
      {files.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {files.map((f) => (
            <li key={f.path} className="flex items-center gap-2">
              <input type="hidden" name="evidencePath" value={f.path} />
              <span>📎 {f.name}</span>
              <button type="button" className="underline underline-offset-2" onClick={() => setFiles((all) => all.filter((x) => x.path !== f.path))}>
                remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
