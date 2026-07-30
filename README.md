# Get About Bristol

A map + list view of Bristol transport infrastructure projects (Liveable Neighbourhoods, cycle
infra, major corridors, rail/MetroBus), aggregating what's currently scattered across
bristolonthemove.com, the BCC Ask Bristol project pages and Travelwest.

## Stack

Vite + React + TypeScript, MapLibre GL JS for the map. Basemap is OpenFreeMap's "liberty" vector
style (free, no API key). Liveable Neighbourhood areas and corridor projects are highlighted as
real polygons/lines on the map, not just point markers, wherever we have geometry for them.

**Vite quirk:** `vite.config.ts` excludes `maplibre-gl` from `optimizeDeps`. Without that, Vite's
dep pre-bundler mangles the worker chunk maplibre needs for vector-tile parsing (it 404s), which
silently breaks all tile loading with no console error — the map just renders a blank background.
If you ever see that again, check `node_modules/.vite/deps/maplibre-gl-worker.mjs` for a 404.

## Data model

Three layers:

- **`src/data/projects.ts`** — the curated project list (name, area, category, status, source
  link, `lastUpdated`, optional `geometryUrl`/`geometryType`). This is *not* scraped. It's meant
  to be kept current by periodically re-reading the source sites (manually or with AI assistance)
  and editing this file — see the `lastUpdated` field on each entry as the staleness indicator.
- **`public/data/*.geojson`** (Open Data Bristol) — GIS context layers pulled from their ArcGIS
  Hub: cycle network (with existing/proposed/aspirational status per segment), bus stops, and the
  East Bristol LN boundary. Re-fetch with:

  ```bash
  node scripts/fetch-opendata.mjs
  ```

  Verified 2026-07-30: Open Data Bristol's DCAT feed
  (`https://opendata.bristol.gov.uk/api/feed/dcat-us/1.1.json`) is live, and the cycle network
  dataset shows a modified date of 2025-09-05 — current, not the 2017 snapshot the original
  research turned up.

- **`public/data/{a4_portway,bus_route_2,metrobus_network}.geojson`** (OpenStreetMap, via
  Overpass) — real road/route geometry for corridor projects that have no dataset on Open Data
  Bristol. Bus Route 2 and MetroBus m1–m4 are unambiguous OSM route relations (First West of
  England / Metrobus, matched by `ref` + `network` tag). Re-fetch with:

  ```bash
  node scripts/fetch-osm-routes.mjs
  ```

  Overpass is a shared public resource — this script deliberately fetches one relation at a time
  with a delay between requests. Don't parallelize it or run it in a tight loop.

- **`public/data/south_bristol_ln_boundary.geojson`** — traced along real road centrelines
  (Coronation Road, Ashton Road, Winterstoke Road, Bedminster Down Road, Bedminster Road, Saint
  John's Lane, Wells Road, via Overpass) to match BCC's published study-area map, with a few short
  straight bridges at complex junctions where the exact connecting road wasn't identified. No
  official GIS boundary is published; replace this if BCC ever publishes one (re-search Open Data
  Bristol's DCAT feed for "liveable"). Assembly script isn't checked in — see git history for the
  Overpass queries and stitching approach if this needs rebuilding.

## Adding/updating a project

### Rule 1 — it must improve mobility around the city

The bar for inclusion is a change to how people **move about Bristol**: new or reallocated road
space, bus priority, cycle routes, traffic/access changes, new services or stops that open up
journeys, area-wide schemes like Liveable Neighbourhoods.

Point-improvements to an existing facility are *not* in scope on their own — step-free access at a
station, a rebuilt bus shelter, better signage or lighting at a stop. Those are worth doing, but
they improve one place; they don't change how you get across the city. Include such works only when
they're part of a scheme that does (e.g. a station upgrade that comes with a new line or service).

If it's genuinely borderline, prefer leaving it out and note it under "Not yet built" rather than
padding the list.

### Rule 2 — link to the best summary page for the project

`sourceUrl` should be the page that best summarises *this* project — not a site homepage, not a news
index, not a PDF if an HTML page covers the same ground. A reader clicking through should land on
something that tells them what the scheme is.

Check the link actually resolves and actually contains project specifics before committing it.
Where an entry legitimately covers more than one programme, give each its own link via `extraLinks`
rather than picking one and hoping — see the `metrobus-jltp` entry.

### Rule 3 — the description says what's changing and why it's better

Every entry's `description` must answer both halves:

- **What is being changed** — concretely. Which streets, which routes, what physical or operational
  change. Name things.
- **Why it's an improvement** — what it lets people do that they couldn't before, or does better.

Keep it short: a few sentences, or bullet-style clauses. Write it from the source page, not from
assumption. If the source doesn't say what's changing, that's a signal the entry isn't ready —
leave `status: "unknown"` and say plainly what's unconfirmed rather than inventing detail.

Data-provenance notes (which OSM relation the geometry came from, how a boundary was traced, what
still needs verifying) are useful and belong in the description too — but *after* the what/why, not
instead of it.

### Mechanics

Edit `src/data/projects.ts`. Each entry needs `coordinates` as `[lon, lat]` for its marker.
Optionally set `geometryUrl` (path under `/data`) + `geometryType` (`"line"` or `"polygon"`) to
highlight the project's actual area/route instead of just a dot — `MapView` renders whatever's in
that GeoJSON, colored by category, with click-to-select and `fitBounds` on selection. Update
`lastUpdated` whenever you re-check an entry against its source.

## Not yet built

- No scrapers — the brief's ~6 unstructured sources are covered by the manual/AI-curated seed
  data above, not automated fetching.
- "City Centre transport transformation" has no natural route/boundary and stays as a point
  marker.
- No rail line geometry — the MetroBus & JLTP entry only highlights the four MetroBus routes; the
  JLTP's rail-enhancement element has nothing to draw.
- **No `cycle_infra` project entries.** The category and its filter exist, and the Open Data
  Bristol cycle network map layer is unaffected, but no scheme currently qualifies under Rule 1 —
  see "Deliberately excluded" below.

## Deliberately excluded

Kept here so they don't get re-added by the next curation pass:

- **Liveable Neighbourhoods programme (overview)** — BCC's hub page indexing each LN microsite.
  An index, not a scheme; the individual LNs are listed on their own.
- **Bike Bristol** — unofficial campaign group tracking cycle infrastructure rollout. A useful
  cross-check against official sources, but a news tracker rather than a project, and not
  authoritative. Worth consulting when curating; not an entry.

Both fail Rule 1: they're places to read about mobility changes, not mobility changes.

## Development

```bash
npm install
npm run dev
```
