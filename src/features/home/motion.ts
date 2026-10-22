// The home page's motion switch. Motion is on unless the visitor turned it off
// with the page's own "Motion off" button (stored in this browser only).
export const MOTION_KEY = "nk-motion";

export function motionAllowed(): boolean {
  try {
    return localStorage.getItem(MOTION_KEY) !== "off";
  } catch {
    return true;
  }
}
