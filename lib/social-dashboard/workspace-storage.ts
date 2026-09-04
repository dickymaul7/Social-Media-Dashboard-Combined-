export type CalendarItem = { id: string; date: string; type: string; title: string };
export type WorkspaceLink = { id: string; label: string; url: string; category: string };

const calendarKey = (brandId: string) => `proxsis-social-calendar:${brandId}`;
const linksKey = (brandId: string) => `proxsis-social-links:${brandId}`;

export const DEFAULT_WORKSPACE_LINKS: WorkspaceLink[] = [
  { id: "content-plan", label: "Content plan — Google Sheets", url: "https://docs.google.com/spreadsheets/", category: "Planning" },
  { id: "meta-suite", label: "Meta Business Suite", url: "https://business.facebook.com/latest/insights/", category: "Analytics" },
  { id: "brand-assets", label: "Proxsis brand assets", url: "https://drive.google.com/", category: "Assets" },
  { id: "canva", label: "Canva workspace", url: "https://www.canva.com/", category: "Creative" },
];

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function loadCalendar(brandId: string): CalendarItem[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(calendarKey(brandId)), []);
}

export function saveCalendarItems(brandId: string, items: CalendarItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(calendarKey(brandId), JSON.stringify(items));
}

export function loadWorkspaceLinks(brandId: string): WorkspaceLink[] {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE_LINKS;
  return safeParse(window.localStorage.getItem(linksKey(brandId)), DEFAULT_WORKSPACE_LINKS);
}

export function saveWorkspaceLinks(brandId: string, items: WorkspaceLink[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(linksKey(brandId), JSON.stringify(items));
}
