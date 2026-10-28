"use client";

import { useState, type ChangeEvent } from "react";

import { heritageFileProblem } from "@/features/heritage/parse";
import { createClient } from "@/lib/supabase/client";

// One private file (PDF, scan, recording) into the member's own folder of
// the 'workspace' bucket -- readable by no one else.
export function WorkspaceFileInput({ userId, inputId }: { userId: string; inputId: string }) {
  const [file, setFile] = useState<{ path: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    const problem = heritageFileProblem(chosen);
    if (problem || chosen.type === "image/tiff") {
      setMessage(problem ?? "Use a PDF, an image (JPG, PNG, WebP), an audio file or a text file.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const safe = chosen.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
    const path = `${userId}/${Date.now()}-${safe}`;
    const { error } = await createClient().storage.from("workspace").upload(path, chosen, { contentType: chosen.type, upsert: false });
    setBusy(false);
    if (error) setMessage("The file could not be uploaded. Please try again.");
    else setFile({ path, name: chosen.name });
  }

  return (
    <div className="flex flex-col gap-2">
      <input id={inputId} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/wav,text/plain" onChange={onChange} disabled={busy} className="text-sm text-foreground" />
      {busy ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
      {message ? (
        <p role="alert" className="text-xs text-destructive">
          {message}
        </p>
      ) : null}
      {file ? (
        <p className="text-xs text-muted-foreground">
          <input type="hidden" name="filePath" value={file.path} />📎 {file.name}
        </p>
      ) : null}
    </div>
  );
}
