"use client";

import { useState, type ChangeEvent } from "react";

import { createClient } from "@/lib/supabase/client";

import { heritageFileProblem } from "../parse";

// One file (photo, scan, PDF, recording) into the member's own folder of
// the private 'heritage' bucket; fills a hidden filePath field.
export function HeritageFileInput({ userId, inputId }: { userId: string; inputId: string }) {
  const [file, setFile] = useState<{ path: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    const problem = heritageFileProblem(chosen);
    if (problem) {
      setMessage(problem);
      return;
    }
    setBusy(true);
    setMessage(null);
    const safe = chosen.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
    const path = `${userId}/${Date.now()}-${safe}`;
    const { error } = await createClient().storage.from("heritage").upload(path, chosen, { contentType: chosen.type, upsert: false });
    setBusy(false);
    if (error) setMessage("The file could not be uploaded. Please try again.");
    else setFile({ path, name: chosen.name });
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        id={inputId}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/tiff,audio/mpeg,audio/mp4,audio/wav,text/plain"
        onChange={onChange}
        disabled={busy}
        className="text-sm text-foreground"
      />
      {busy ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
      {message ? (
        <p role="alert" className="text-xs text-destructive">
          {message}
        </p>
      ) : null}
      {file ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="hidden" name="filePath" value={file.path} />
          <span>📎 {file.name}</span>
          <button type="button" className="underline underline-offset-2" onClick={() => setFile(null)}>
            remove
          </button>
        </p>
      ) : null}
    </div>
  );
}
