"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";

import { createClient } from "@/lib/supabase/client";

import { setProfilePhotoAction } from "../actions";
import { photoProblem } from "../parse";

// Picks a photo, shrinks it in the browser (at most 640 px, JPEG) so uploads
// are small and fast, puts it in the member's own folder of the private
// 'avatars' bucket, then points the profile at it.

const MAX_SIDE = 640;

async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  return blob ?? file;
}

export function PhotoUploader({ userId, hasPhoto }: { userId: string; hasPhoto: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = photoProblem(file);
    if (problem) {
      setMessage(problem);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const blob = await shrink(file);
      const path = `${userId}/${Date.now()}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) {
        setMessage("The photo could not be uploaded. Please try again.");
        return;
      }
      const failure = await setProfilePhotoAction(path);
      if (failure) {
        setMessage(failure);
        return;
      }
      router.refresh();
    } catch {
      setMessage("The photo could not be read. Try another file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input
        ref={input}
        id="profile-photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onChange}
        disabled={busy}
      />
      <label
        htmlFor="profile-photo"
        className="inline-flex cursor-pointer items-center rounded-full bg-nk-lime px-5 py-2.5 text-sm font-semibold text-nk-ink transition-transform hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-border-focus"
      >
        {busy ? "Uploading…" : hasPhoto ? "Change photo" : "Add a photo"}
      </label>
      <p className="mt-2 text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB.</p>
      {message ? (
        <p role="alert" className="mt-2 text-sm text-tone-danger-fg">
          {message}
        </p>
      ) : null}
    </div>
  );
}
