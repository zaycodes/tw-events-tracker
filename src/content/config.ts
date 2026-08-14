import { defineCollection, z } from "astro:content";

export const TAGS = [
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
] as const;

// Deadlines are kept as raw strings, not z.coerce.date(), so the component
// layer can tell a bare "YYYY-MM-DD" (date known, exact time not) apart from
// a full "YYYY-MM-DDTHH:mm:ssZ" (precise UTC instant). Only the latter gets
// a "your local time" conversion rendered client-side — see EventCard.astro.
const dateOrDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?)?$/, "expected YYYY-MM-DD or ISO 8601 datetime");

const events = defineCollection({
  type: "data",
  schema: z.object({
    name: z.string(),
    url: z.string().url(),
    organizer: z.string(),
    format: z.enum(["virtual", "in-person", "hybrid"]),
    location: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    cfpDeadline: dateOrDateTime.optional(),
    registrationDeadline: dateOrDateTime.optional(),
    cost: z.enum(["free", "paid", "unknown"]).default("unknown"),
    tags: z.array(z.enum(TAGS)).default([]),
    description: z.string().optional(),
    source: z.enum(["scraped", "community", "curated"]).default("curated"),
    addedDate: z.coerce.date(),
  }),
});

export const collections = { events };
