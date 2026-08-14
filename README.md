# TW Events Tracker

A community-maintained tracker of events for technical writers: documentation
conferences, DevRel and open-source events, no-code/low-code events, calls
for speakers, community meetups, webinars, and mentorship programs (Outreachy,
LFX, etc.) — anything relevant whether or not it's specifically branded as a
"technical writing" event.

## How events get added

There are three paths in, and they all end the same way: **a PR against
`src/content/events/`, reviewed by a maintainer before merge.** Nothing is
auto-published.

1. **Manual PR** — add a JSON file to `src/content/events/` following the
   shape in `src/content/config.ts`, open a PR.
2. **Community submission** — via [the web form](/submit) or a
   [GitHub issue](../../issues/new?template=submit-event.yml). Both land as a
   GitHub issue labeled `event-submission`. A maintainer adds the `approved`
   label once it looks legitimate; `.github/workflows/issue-to-pr.yml` then
   generates the event file and opens a PR automatically.
3. **Weekly scrape** — `.github/workflows/weekly-scrape.yml` runs
   `scripts/scrape.mjs` every Monday, which pulls from source adapters in
   `scripts/sources/` and opens a PR with anything new.

## Event schema

See `src/content/config.ts` for the full Zod schema. Key fields:

- `format`: `virtual` / `in-person` / `hybrid`
- `cfpDeadline` / `registrationDeadline`: whichever's relevant — a CFP-open
  listing should also carry the `cfp-open` tag
- `tags`: see `VALID_TAGS` in `src/content/config.ts` and
  `scripts/lib/schema.mjs` (keep both in sync if you add one)
- `source`: `curated` / `community` / `scraped` — just provenance, doesn't
  affect display

## Scraper sources

Currently just `scripts/sources/writethedocs.mjs`, which parses the "Current
Conferences" section of writethedocs.org/conf/ (stable, semantic HTML — no
API needed). It doesn't pick up CFP deadlines from that page, so those get
filled in by whoever reviews the PR.

Deliberately **not** scraping a general web-search API (Bing/SerpAPI/Google
CSE) — that needs a paid key and tends to add noise. The plan is: curated
adapters for sources with genuinely stable structure, plus community
submissions to catch what scraping misses.

Candidates for future adapters (unverified — check before wiring one up,
markup/APIs change):
- Outreachy, LFX Mentorship — both have predictable, dated application
  windows (mentorship-tagged)
- All Things Open, DevFest chapters with a documentation/community track —
  DevFest tracks vary by chapter, so confirm before assuming a given
  DevFest has one
- No-Code Calendar (nocodecalendar.com) — no confirmed public feed as of
  this writing; would need an HTML scrape adapter
- WriteTech Hub's own [events page](https://writetechhub.org/events/) once
  it lists dated (not just ongoing) events

**Papercall.io is shutting down August 31, 2026** — deliberately not used
as a source.

To add a source: create `scripts/sources/<name>.mjs` exporting an async
`fetchEvents()` that returns an array shaped like the event schema (minus
`source`/`addedDate`, which `scrape.mjs` fills in), then add it to the
`SOURCES` array in `scripts/scrape.mjs`.

## Local development

```
npm install
npm run dev       # http://localhost:4321
npm run build     # also validates every event file against the schema
npm run scrape    # run the scraper locally, writes new files if it finds anything
```

## Setup checklist (before automation goes live)

- [ ] Create the GitHub repo, push this code
- [ ] Connect the repo to Netlify (build command `npm run build`, publish
      dir `dist`, functions dir `netlify/functions`)
- [ ] Create a GitHub PAT (`repo` + `issues` scope) and set it as
      `GITHUB_TOKEN` in Netlify's environment variables — this lets the
      `/submit` form's function open issues on your behalf
- [ ] Confirm `.github/workflows/weekly-scrape.yml` and `issue-to-pr.yml`
      have `contents: write` / `pull-requests: write` permissions enabled
      in the repo's Actions settings
