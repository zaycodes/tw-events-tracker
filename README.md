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

## Local development

```
npm install
npm run dev       # http://localhost:4321
npm run build     # also validates every event file against the schema
npm run scrape    # run the scraper locally, writes new files if it finds anything
```
