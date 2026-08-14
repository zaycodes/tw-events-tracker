import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function loadExistingEvents(eventsDir) {
  let files;
  try {
    files = await readdir(eventsDir);
  } catch {
    return [];
  }
  const events = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(path.join(eventsDir, file), "utf8");
      events.push(JSON.parse(raw));
    } catch (err) {
      console.error(`Skipping unreadable event file ${file}: ${err.message}`);
    }
  }
  return events;
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeUrl(url) {
  return url.toLowerCase().replace(/\/+$/, "").replace(/^https?:\/\//, "");
}

export function isDuplicate(candidate, existingEvents) {
  return existingEvents.some((existing) => {
    const sameUrl = normalizeUrl(existing.url) === normalizeUrl(candidate.url);
    const sameNameAndDate =
      normalizeName(existing.name) === normalizeName(candidate.name) &&
      existing.startDate === candidate.startDate;
    return sameUrl || sameNameAndDate;
  });
}
