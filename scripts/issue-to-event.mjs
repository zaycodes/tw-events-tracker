// Turns an approved "event-submission" issue (filed via
// .github/ISSUE_TEMPLATE/submit-event.yml, either directly on GitHub or via
// the /submit web form -> Netlify function) into an event JSON file.
// Invoked by .github/workflows/issue-to-pr.yml, which opens a PR from the
// result the same way the weekly scraper does.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateEvent, buildFilename, VALID_TAGS } from "./lib/schema.mjs";
import { loadExistingEvents, isDuplicate } from "./lib/dedupe.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_DIR = path.join(__dirname, "..", "src", "content", "events");

const LABEL_TO_FIELD = {
  "Event name": "name",
  "Link": "url",
  "Organizer": "organizer",
  "Format": "format",
  "Location (if in-person or hybrid)": "location",
  "Start date": "startDate",
  "End date": "endDate",
  "CFP / call for speakers deadline": "cfpDeadline",
  "Registration deadline": "registrationDeadline",
  "Cost": "cost",
  "Tags (comma-separated)": "tags",
  "Description": "description",
};

function parseIssueBody(body) {
  const fields = {};
  const sections = body.split(/^### /m).slice(1);
  for (const section of sections) {
    const newlineIndex = section.indexOf("\n");
    const label = section.slice(0, newlineIndex).trim();
    let value = section.slice(newlineIndex + 1).trim();
    if (value === "_No response_" || value === "") value = undefined;
    const key = LABEL_TO_FIELD[label];
    if (key) fields[key] = value;
  }
  return fields;
}

function toEvent(fields) {
  const event = {
    name: fields.name,
    url: fields.url,
    organizer: fields.organizer,
    format: fields.format,
    cost: fields.cost || "unknown",
    tags: (fields.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter((t) => VALID_TAGS.includes(t)),
    source: "community",
    addedDate: new Date().toISOString().slice(0, 10),
  };
  if (fields.location) event.location = fields.location;
  if (fields.startDate) event.startDate = fields.startDate;
  if (fields.endDate) event.endDate = fields.endDate;
  if (fields.cfpDeadline) event.cfpDeadline = fields.cfpDeadline;
  if (fields.registrationDeadline) event.registrationDeadline = fields.registrationDeadline;
  if (fields.description) event.description = fields.description;
  return event;
}

async function main() {
  const body = process.env.ISSUE_BODY;
  const issueNumber = process.env.ISSUE_NUMBER || "unknown";

  if (!body) {
    console.error("ISSUE_BODY env var is required");
    process.exit(1);
  }

  const fields = parseIssueBody(body);
  const event = toEvent(fields);

  const { valid, errors } = validateEvent(event);
  if (!valid) {
    console.error(`Issue #${issueNumber} did not produce a valid event:`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  const existing = await loadExistingEvents(EVENTS_DIR);
  if (isDuplicate(event, existing)) {
    console.log(`Issue #${issueNumber}: "${event.name}" already exists, skipping.`);
    process.exit(0);
  }

  await mkdir(EVENTS_DIR, { recursive: true });
  const filename = buildFilename(event);
  const filePath = path.join(EVENTS_DIR, filename);
  await writeFile(filePath, JSON.stringify(event, null, 2) + "\n", "utf8");

  console.log(`Wrote ${filePath}`);
}

main();
