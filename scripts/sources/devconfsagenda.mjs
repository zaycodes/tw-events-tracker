// Pulls from developers-conferences-agenda (github.com/scraly/developers-conferences-agenda),
// a community-maintained, actively-updated list of developer conferences and CFPs. Its TAGS.csv
// enrichment file tags individual events with topic:documentation, topic:writing, and
// topic:developer-relations — precisely on-target for this tracker, unlike confs.tech's much
// broader (and noisier) "opensource" topic.
//
// There's no structured per-event JSON here, though — the actual event details (dates, URL,
// location, CFP deadline) only live in README.md as a dated markdown list, not in the CSVs. So
// this adapter fetches TAGS.csv to find which event_ids match our target topics, then parses
// README.md's markdown to get the details for just those ids. More fragile than a pure-JSON
// source (README formatting could change), but the topical precision is worth it.
const README_URL = "https://raw.githubusercontent.com/scraly/developers-conferences-agenda/master/README.md";
const TAGS_URL = "https://raw.githubusercontent.com/scraly/developers-conferences-agenda/master/TAGS.csv";

const TARGET_TAGS = new Set(["topic:documentation", "topic:writing", "topic:developer-relations"]);

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function pad(n) {
  return String(n).padStart(2, "0");
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "tw-events-tracker-bot" } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

// event_id format in TAGS.csv is "YYYY-MM-DD-Event Name" (matches the date the event starts).
function parseTargetIds(tagsCsv) {
  const ids = new Set();
  for (const line of tagsCsv.split("\n").slice(1)) {
    if (!line.trim()) continue;
    const [eventId, ...tags] = line.split(",");
    if (tags.some((t) => TARGET_TAGS.has(t.trim()))) {
      ids.add(eventId.trim());
    }
  }
  return ids;
}

const ITEM_RE =
  /^\* (\d{1,2})(?:-\d{1,2})?: \[([^\]]+)\]\(([^)]+)\)(?:\s*-\s*([^<\n]+))?\s*(?:<a href="([^"]+)">.*?message=until%20(\d{1,2})-([A-Za-z]+)-(\d{4})&)?/;

function parseReadme(readme) {
  const events = [];
  let year = null;
  let month = null;

  for (const line of readme.split("\n")) {
    const yearMatch = line.match(/^## (\d{4})$/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
      month = null;
      continue;
    }
    const monthMatch = line.match(/^### ([A-Za-z]+)$/);
    if (monthMatch && MONTHS[monthMatch[1].toLowerCase()]) {
      month = MONTHS[monthMatch[1].toLowerCase()];
      continue;
    }
    if (!year || !month) continue;

    const m = line.match(ITEM_RE);
    if (!m) continue;
    const [, day, name, url, location, , cfpDay, cfpMonthName, cfpYear] = m;

    const startDate = `${year}-${pad(month)}-${pad(parseInt(day, 10))}`;
    const event = {
      eventId: `${startDate}-${name.trim()}`,
      name: name.trim(),
      url: url.trim(),
      location: location?.trim(),
      startDate,
    };
    if (cfpDay && cfpMonthName && cfpYear && MONTHS[cfpMonthName.toLowerCase()]) {
      event.cfpDeadline = `${cfpYear}-${pad(MONTHS[cfpMonthName.toLowerCase()])}-${pad(parseInt(cfpDay, 10))}`;
    }
    events.push(event);
  }
  return events;
}

export async function fetchEvents() {
  const [readme, tagsCsv] = await Promise.all([fetchText(README_URL), fetchText(TAGS_URL)]);
  const targetIds = parseTargetIds(tagsCsv);
  const parsed = parseReadme(readme).filter((e) => targetIds.has(e.eventId));

  return parsed.map((e) => {
    const location = e.location && !/^online$/i.test(e.location) ? e.location : undefined;
    const format = /online/i.test(e.location || "") ? "virtual" : "in-person";
    const tags = e.cfpDeadline
      ? ["technical-writing", "conference", "cfp-open"]
      : ["technical-writing", "conference"];
    return {
      name: e.name,
      url: e.url,
      organizer: e.name,
      format,
      ...(location ? { location } : {}),
      startDate: e.startDate,
      ...(e.cfpDeadline ? { cfpDeadline: e.cfpDeadline } : {}),
      tags,
    };
  });
}
