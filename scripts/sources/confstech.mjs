// Pulls from confs.tech's own open-source, community-maintained data repo
// (github.com/tech-conferences/conference-data) — plain JSON on GitHub, not
// HTML to scrape, so this is far less likely to break than a markup-parsing
// adapter. It has no dedicated "technical writing" or "content strategy"
// topic. Its "opensource" topic is the closest fit; "api", "ux", and
// "product" were tried too, but were far too broad for this tracker's niche
// (Bitcoin conferences, Scrum Master Day, generic frontend/UX events) —
// deliberately left out.
//
// Even "opensource" skews toward general infra/platform tooling rather than
// community/content/docs, so EXCLUDE_KEYWORDS drops the categories that
// showed up repeatedly and are clearly a different audience: cryptocurrency
// conferences, single CMS-platform events, and observability/monitoring/
// analytics tooling days. This is a blunt heuristic, not a guarantee — a PR
// still goes through review either way, this just cuts the obvious noise
// before it gets there.
const BASE = "https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences";
const TOPICS = [{ file: "opensource", tag: "open-source" }];
const EXCLUDE_KEYWORDS = [
  "bitcoin", "crypto", "blockchain", "web3",
  "joomla", "umbraco", "drupal", "wordpress",
  "observability", "monitoring", "analytics", "kubernetes",
];

function isExcluded(name) {
  const lower = name.toLowerCase();
  return EXCLUDE_KEYWORDS.some((kw) => lower.includes(kw));
}

function inferFormat(conf) {
  if (conf.online && conf.city) return "hybrid";
  if (conf.online || !conf.city) return "virtual";
  return "in-person";
}

function inferLocation(conf) {
  if (conf.city && conf.country) return `${conf.city}, ${conf.country}`;
  return conf.city || conf.country || undefined;
}

export async function fetchEvents() {
  const currentYear = new Date().getUTCFullYear();
  const events = [];

  for (const year of [currentYear, currentYear + 1]) {
    for (const { file, tag } of TOPICS) {
      const url = `${BASE}/${year}/${file}.json`;
      let confs;
      try {
        const res = await fetch(url, { headers: { "User-Agent": "tw-events-tracker-bot" } });
        if (!res.ok) continue; // that year's file may not exist yet
        confs = await res.json();
      } catch {
        continue;
      }

      for (const c of confs) {
        if (!c.name || !c.url || !c.startDate) continue;
        if (isExcluded(c.name)) continue;
        const location = inferLocation(c);
        const tags = c.cfpEndDate ? [tag, "conference", "cfp-open"] : [tag, "conference"];
        events.push({
          name: c.name,
          url: c.url,
          organizer: c.name,
          format: inferFormat(c),
          ...(location ? { location } : {}),
          startDate: c.startDate,
          ...(c.endDate ? { endDate: c.endDate } : {}),
          ...(c.cfpEndDate ? { cfpDeadline: c.cfpEndDate } : {}),
          tags,
        });
      }
    }
  }

  return events;
}
