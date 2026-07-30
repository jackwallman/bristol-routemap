# Get About Bristol

Map + list of Bristol transport infrastructure projects. Vite + React + TS, MapLibre GL.
See `README.md` for the stack, the data model, and the re-fetch scripts.

## Rules for adding a project to `src/data/projects.ts`

These are inclusion rules, not style preferences. Apply them before adding or editing an entry.
Full reasoning in README.md → "Adding/updating a project".

1. **It must improve mobility about the city.** Reallocated road space, bus priority, cycle routes,
   access/traffic changes, new services, area-wide schemes. Accessibility or amenity improvements to
   a single existing facility — step-free access at a station, a rebuilt bus shelter, better signage
   at a stop — do **not** qualify on their own; they improve one place rather than how people get
   around. Include them only as part of a scheme that does. When borderline, leave it out.

2. **`sourceUrl` links to the page that best summarises that project.** Never a site homepage, news
   index, or PDF where an HTML equivalent exists. Fetch the URL and confirm it actually contains
   project specifics before committing it. If an entry covers more than one programme, give each its
   own link via `extraLinks` (see `metrobus-jltp`).

3. **`description` says what is changing and why it is an improvement.** Both halves, concretely —
   name the streets/routes and the actual change, then what it lets people do that they couldn't
   before. A few sentences or bullet-style clauses. Write it from the source page. If the source
   doesn't say what's changing, the entry isn't ready: keep `status: "unknown"` and state what's
   unconfirmed rather than inventing detail. Provenance notes (OSM relation used, how a boundary was
   traced, what needs verifying) go after the what/why, not instead of it.

Set `lastUpdated` to the date you actually re-checked the entry against its source.

## Verifying

`npx tsc -b --noEmit` and `npx oxlint src` both run clean — keep them that way.
