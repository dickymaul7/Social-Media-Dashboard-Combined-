export type ExpansionChannel = "linkedin" | "seo_geo";

export type ExpansionCalendarItem = {
  id: string;
  brief_id: string;
  brand_id: string | null;
  brand_name: string;
  channel: ExpansionChannel;
  title: string;
  scheduled_for: string;
  updated_at: string;
};

const INDEX_KEY = "proxsis-smm:expansion-calendar:v1";

function readAll(): ExpansionCalendarItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(INDEX_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: ExpansionCalendarItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("proxsis:calendar-changed"));
}

export function loadExpansionCalendarItems() {
  return readAll().sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
}

export function loadExpansionCalendarItem(briefId: string, channel: ExpansionChannel) {
  return readAll().find((item) => item.brief_id === briefId && item.channel === channel) || null;
}

export function saveExpansionCalendarItem(item: ExpansionCalendarItem) {
  const items = readAll();
  const index = items.findIndex((current) => current.brief_id === item.brief_id && current.channel === item.channel);
  if (index >= 0) items[index] = item;
  else items.push(item);
  writeAll(items);
}

export function moveExpansionCalendarItem(id: string, scheduledFor: string) {
  const items = readAll();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  items[index] = { ...items[index], scheduled_for: scheduledFor, updated_at: new Date().toISOString() };
  writeAll(items);
  return items[index];
}
