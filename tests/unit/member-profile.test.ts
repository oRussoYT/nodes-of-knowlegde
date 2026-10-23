import { describe, expect, it } from "vitest";

import {
  EMPTY_PROFILE,
  isOwnPhotoPath,
  normalizeOrcid,
  normalizeWebsite,
  parseProfileForm,
  parseProfileRow,
  photoProblem,
  profileChecklist,
  shownName,
} from "@/features/member-profile/parse";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const USER = "11111111-2222-4333-8444-555555555555";

describe("member profile parsing", () => {
  it("reads a row and falls back to an empty profile", () => {
    expect(parseProfileRow(null)).toEqual(EMPTY_PROFILE);
    const p = parseProfileRow({ display_name: "Ana", headline: " ", visibility: "private", photo_path: `${USER}/1.jpg` });
    expect(p.displayName).toBe("Ana");
    expect(p.headline).toBeNull();
    expect(p.visibility).toBe("private");
    expect(p.photoPath).toBe(`${USER}/1.jpg`);
    expect(parseProfileRow({ visibility: "public" }).visibility).toBe("members");
  });

  it("normalizes ORCID iDs and links", () => {
    expect(normalizeOrcid("https://orcid.org/0000-0002-1825-0097")).toBe("0000-0002-1825-0097");
    expect(normalizeOrcid("0000-0002-1694-233x")).toBe("0000-0002-1694-233X");
    expect(normalizeOrcid("1234")).toBeNull();
  });

  it("normalizes websites and refuses non-web addresses", () => {
    expect(normalizeWebsite("example.org")).toBe("https://example.org");
    expect(normalizeWebsite("http://lab.example.org/x")).toBe("http://lab.example.org/x");
    expect(normalizeWebsite("javascript:alert(1)")).toBeNull();
    expect(normalizeWebsite("not a site")).toBeNull();
    expect(normalizeWebsite("localhost")).toBeNull();
  });

  it("validates the form and clears empty fields", () => {
    const ok = parseProfileForm(form({ displayName: " Ana ", headline: "", orcid: "", website: "", visibility: "members" }));
    expect(ok).toEqual({
      ok: true,
      values: { display_name: "Ana", headline: null, location: null, biography: null, website: null, orcid: null, visibility: "members" },
    });
    expect(parseProfileForm(form({ orcid: "12", visibility: "members" })).ok).toBe(false);
    expect(parseProfileForm(form({ website: "ftp://x.org", visibility: "members" })).ok).toBe(false);
    expect(parseProfileForm(form({ visibility: "everyone" })).ok).toBe(false);
    expect(parseProfileForm(form({ displayName: "x".repeat(121), visibility: "members" })).ok).toBe(false);
  });

  it("accepts photo paths only in the member's own folder", () => {
    expect(isOwnPhotoPath(`${USER}/1729.jpg`, USER)).toBe(true);
    expect(isOwnPhotoPath(`other/1729.jpg`, USER)).toBe(false);
    expect(isOwnPhotoPath(`${USER}/../x.jpg`, USER)).toBe(false);
    expect(isOwnPhotoPath(`${USER}/a/b.jpg`, USER)).toBe(false);
    expect(isOwnPhotoPath(`${USER}/file.gif`, USER)).toBe(false);
  });

  it("checks photo type and size", () => {
    expect(photoProblem({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(photoProblem({ type: "image/gif", size: 1000 })).toMatch(/JPG/);
    expect(photoProblem({ type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });

  it("shows the chosen name, else the email", () => {
    expect(shownName(EMPTY_PROFILE, "a@b.c")).toBe("a@b.c");
    expect(shownName({ ...EMPTY_PROFILE, displayName: "Ana" }, "a@b.c")).toBe("Ana");
  });
});


describe("profile checklist", () => {
  it("lists what is filled and what is missing", () => {
    expect(profileChecklist(EMPTY_PROFILE).every((item) => !item.done)).toBe(true);
    const items = profileChecklist({ ...EMPTY_PROFILE, displayName: "Ana", orcid: "0000-0002-1825-0097" });
    expect(items.filter((item) => item.done).map((item) => item.key)).toEqual(["name", "links"]);
  });
});
