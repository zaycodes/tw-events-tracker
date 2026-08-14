// Weekly discovery run: pulls candidate events from each source adapter,
// drops anything that already exists or fails validation, and writes the
// rest as new files under src/content/events/. Never touches existing
// files and never opens a PR itself — .github/workflows/weekly-scrape.yml
// does that after this script runs, so every new event still goes through
// human review before it's published.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateEvent, buildFilename } from "./lib/schema.mjs";
import { loadExistingEvents, isDuplicate } from "./lib/dedupe.mjs";
import * as writeTheDocs from "./sources/writethedocs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_DIR = path.join(__dirname, "..", "src", "content", "events");

// Add more adapters here as they're built — each just needs a fetchEvents()
// that returns events shaped like src/content/config.ts (minus source/addedDate).
//
// Deliberately not scraping a general web-search API (Bing/SerpAPI/Google
// CSE) — needs a paid key and tends to add noise. Curated adapters for
// sources with genuinely stable structure, plus community submissions, is
// the plan for catching what a single source misses.
//
// Candidates for future adapters (unverified as of this writing — check
// before wiring one up, markup/APIs change):
//   - Outreachy, LFX Mentorship — predictable, dated application windows
//     (mentorship-tagged)
//   - All Things Open, DevFest chapters with a documentation/community
//     track — DevFest tracks vary by chapter, confirm before assuming a
//     given DevFest has one
//   - No-Code Calendar (nocodecalendar.com) — no confirmed public feed yet;
//     would need an HTML scrape adapter
//   - WriteTech Hub's own events page (writetechhub.org/events/) once it
//     lists dated (not just ongoing) events
//
// Papercall.io is shutting down August 31, 2026 — deliberately not used.
const SOURCES = [{ name: "Write the Docs", module: writeTheDocs }];

async function main() {
  const existing = await loadExistingEvents(EVENTS_DIR);
  const seenThisRun = [...existing];
  const written = [];
  const skipped = [];

  for (const { name, module } of SOURCES) {
    let candidates;
    try {
      candidates = await module.fetchEvents();
    } catch (err) {
      console.error(`[${name}] fetch failed: ${err.message}`);
      continue;
    }

    for (const candidate of candidates) {
      const event = {
        ...candidate,
        cost: candidate.cost || "unknown",
        tags: candidate.tags || [],
        source: "scraped",
        addedDate: new Date().toISOString().slice(0, 10),
      };

      const { valid, errors } = validateEvent(event);
      if (!valid) {
        skipped.push(`[${name}] "${event.name}" invalid: ${errors.join(", ")}`);
        continue;
      }

      if (isDuplicate(event, seenThisRun)) {
        continue;
      }

      seenThisRun.push(event);
      written.push({ name, event });
    }
  }

  if (written.length > 0) {
    await mkdir(EVENTS_DIR, { recursive: true });
    for (const { event } of written) {
      const filePath = path.join(EVENTS_DIR, buildFilename(event));
      await writeFile(filePath, JSON.stringify(event, null, 2) + "\n", "utf8");
    }
  }

  console.log(`Scrape complete: ${written.length} new event(s), ${skipped.length} skipped.`);
  for (const { name, event } of written) console.log(`  + [${name}] ${event.name}`);
  for (const line of skipped) console.log(`  ! ${line}`);
}

main();
