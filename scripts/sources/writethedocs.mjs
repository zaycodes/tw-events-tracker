// Scrapes the "Current Conferences" section of https://www.writethedocs.org/conf/,
// a Sphinx-generated page with stable, semantic markup: one <section id="current-conferences">
// containing a <ul> of <li><p><a href="...">Name</a>, Date range, <strong>Location</strong></p></li>.
// Deliberately scoped to "current" (not past-year sections) to avoid parsing "Cancelled" entries
// and stale years. CFP deadlines aren't listed here, so they're left for a maintainer to fill in
// during PR review.
const INDEX_URL = "https://www.writethedocs.org/conf/";

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function parseDateRange(text, year) {
  const m = text.match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s*-\s*(?:([A-Za-z]+)\s+)?(\d{1,2}))?$/);
  if (!m) return null;
  const [, startMonthName, startDay, endMonthName, endDay] = m;
  const startMonth = MONTHS[startMonthName.toLowerCase()];
  if (!startMonth) return null;
  const startDate = `${year}-${pad(startMonth)}-${pad(startDay)}`;
  let endDate;
  if (endDay) {
    const endMonth = endMonthName ? MONTHS[endMonthName.toLowerCase()] : startMonth;
    if (!endMonth) return null;
    endDate = `${year}-${pad(endMonth)}-${pad(endDay)}`;
  }
  return { startDate, endDate };
}

function inferFormat(location) {
  const lower = (location || "").toLowerCase();
  const hasVirtual = lower.includes("virtual");
  const hasPlace = /,/.test(location || "") || (!hasVirtual && location);
  if (hasVirtual && hasPlace) return "hybrid";
  if (hasVirtual) return "virtual";
  return "in-person";
}

export async function fetchEvents() {
  const res = await fetch(INDEX_URL, { headers: { "User-Agent": "tw-events-tracker-bot" } });
  if (!res.ok) throw new Error(`Failed to fetch ${INDEX_URL}: ${res.status}`);
  const html = await res.text();

  const sectionMatch = html.match(/<section id="current-conferences">([\s\S]*?)<\/section>/);
  if (!sectionMatch) return [];

  const items = [...sectionMatch[1].matchAll(/<li>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/g)];
  const events = [];

  for (const [, inner] of items) {
    const linkMatch = inner.match(/<a[^>]*href="([^"]+)"[^>]*>(?:<span[^>]*>)?([^<]+)/);
    if (!linkMatch) continue; // no link yet (e.g. a placeholder "Portland 2027" entry) — nothing to point to
    const [, href, rawName] = linkMatch;
    const name = rawName.trim();

    const strongMatch = inner.match(/<strong>([^<]+)<\/strong>/);
    const location = strongMatch ? strongMatch[1].trim() : undefined;

    const plainText = inner.replace(/<[^>]+>/g, "").trim();
    let dateText = plainText.startsWith(name) ? plainText.slice(name.length) : plainText;
    dateText = dateText.replace(/^,\s*/, "");
    if (location && dateText.endsWith(location)) {
      dateText = dateText.slice(0, -location.length).replace(/,\s*$/, "").trim();
    }

    const yearMatch = name.match(/(\d{4})/);
    if (!yearMatch) continue;
    const year = yearMatch[1];

    const range = parseDateRange(dateText, year);
    if (!range) continue; // unparseable date text — skip rather than guess

    const url = href.startsWith("http") ? href : new URL(href, INDEX_URL).toString();

    events.push({
      name: `Write the Docs ${name}`,
      url,
      organizer: "Write the Docs",
      format: inferFormat(location),
      ...(location && !location.toLowerCase().startsWith("virtual") ? { location } : {}),
      startDate: range.startDate,
      ...(range.endDate ? { endDate: range.endDate } : {}),
      cost: "unknown",
      tags: ["technical-writing", "documentation", "conference", "community-meetup"],
      description: "Community-run conference for people who care about documentation.",
    });
  }

  return events;
}
