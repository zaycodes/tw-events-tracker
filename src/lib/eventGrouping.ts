import type { CollectionEntry } from "astro:content";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type EventData = CollectionEntry<"events">["data"];

export interface MonthGroup {
  month: number;
  label: string;
  events: EventData[];
}

/** Buckets events by calendar month — groups always come out in calendar
 * order (Jan→Dec, or reversed for "order: desc") regardless of what order
 * the input array was in. Items *within* each month keep whatever relative
 * order they arrived in (e.g. deadline-soonest-first), since that ordering
 * is still meaningful at the single-month scale. */
export function groupByMonth(events: EventData[], order: "asc" | "desc" = "asc"): MonthGroup[] {
  const index = new Map<number, MonthGroup>();
  for (const event of events) {
    const month = event.startDate.getUTCMonth();
    let group = index.get(month);
    if (!group) {
      group = { month, label: MONTH_NAMES[month], events: [] };
      index.set(month, group);
    }
    group.events.push(event);
  }
  const groups = [...index.values()].sort((a, b) => a.month - b.month);
  return order === "desc" ? groups.reverse() : groups;
}
