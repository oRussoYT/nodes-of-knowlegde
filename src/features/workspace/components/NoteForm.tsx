import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PeoplePicker } from "@/features/heritage/components/PeoplePicker";

import { saveNoteAction } from "../actions";
import { NOTE_KINDS, type ResearchNote } from "../parse";
import { WorkspaceFileInput } from "./WorkspaceFileInput";

export function NoteForm({ note, userId }: { note?: ResearchNote; userId: string }) {
  return (
    <form action={saveNoteAction} className="grid gap-4 rounded-md border border-border-default px-4 py-5 sm:grid-cols-[12rem_1fr]">
      {note ? <input type="hidden" name="id" value={note.id} /> : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note-kind">Kind</Label>
        <Select id="note-kind" name="kind" defaultValue={note?.kind ?? "note"}>
          {NOTE_KINDS.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note-title">Title</Label>
        <Input id="note-title" name="title" required maxLength={300} defaultValue={note?.title ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="note-body">Text</Label>
        <Textarea id="note-body" name="body" rows={note ? 14 : 6} defaultValue={note?.body ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="note-people">People it is about (optional)</Label>
        {note && note.people.length > 0 ? (
          <ul className="flex flex-wrap gap-2 text-sm">
            {note.people.map((p) => (
              <li key={p.id} className="rounded-full border border-border-default px-3 py-1">
                <input type="hidden" name="personId" value={p.id} />
                {p.displayName}
              </li>
            ))}
          </ul>
        ) : null}
        <PeoplePicker inputId="note-people" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="note-file">{note?.filePath ? "Replace the file (optional)" : "File (optional — PDF, scan, recording)"}</Label>
        <WorkspaceFileInput userId={userId} inputId="note-file" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit">{note ? "Save" : "Create"}</Button>
      </div>
    </form>
  );
}
