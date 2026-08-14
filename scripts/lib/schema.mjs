export const VALID_FORMATS = ["virtual", "in-person", "hybrid"];
export const VALID_COSTS = ["free", "paid", "unknown"];
export const VALID_TAGS = [
  "technical-writing",
  "documentation",
  "devrel",
  "open-source",
  "no-code",
  "low-code",
  "career",
  "workshop",
  "community-meetup",
  "webinar",
  "conference",
  "cfp-open",
  "mentorship",
  "content-strategy",
  "information-architecture",
  "api-docs",
];

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Matches src/content/config.ts's dateOrDateTime: either a bare "YYYY-MM-DD"
// (date known, exact time not) or a full ISO 8601 UTC/offset datetime.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_OR_DATETIME_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?)?$/;

export function buildFilename(event) {
  return `${event.startDate}-${slugify(event.name)}.json`;
}

export function validateEvent(event) {
  const errors = [];
  if (!event.name) errors.push("missing name");
  if (!event.url || !/^https?:\/\//.test(event.url)) errors.push("missing/invalid url");
  if (!event.organizer) errors.push("missing organizer");
  if (!VALID_FORMATS.includes(event.format)) errors.push(`invalid format: ${event.format}`);
  if (!event.startDate || !DATE_RE.test(event.startDate)) {
    errors.push("missing/invalid startDate (expected YYYY-MM-DD)");
  }
  if (event.endDate && !DATE_RE.test(event.endDate)) {
    errors.push("invalid endDate (expected YYYY-MM-DD)");
  }
  if (event.cfpDeadline && !DATE_OR_DATETIME_RE.test(event.cfpDeadline)) {
    errors.push("invalid cfpDeadline (expected YYYY-MM-DD or ISO 8601 datetime)");
  }
  if (event.registrationDeadline && !DATE_OR_DATETIME_RE.test(event.registrationDeadline)) {
    errors.push("invalid registrationDeadline (expected YYYY-MM-DD or ISO 8601 datetime)");
  }
  if (event.cost && !VALID_COSTS.includes(event.cost)) errors.push(`invalid cost: ${event.cost}`);
  if (event.tags) {
    const bad = event.tags.filter((t) => !VALID_TAGS.includes(t));
    if (bad.length) errors.push(`unknown tags: ${bad.join(", ")}`);
  }
  return { valid: errors.length === 0, errors };
}
