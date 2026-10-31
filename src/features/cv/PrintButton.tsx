"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-md border border-border-default px-4 py-2 text-sm print:hidden">
      Print or save as PDF
    </button>
  );
}
