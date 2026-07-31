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

  If you do rebuild it, the ring must come out **simple** — no vertex visited twice, no crossing
  segments. Stitching OSM ways naturally leaves out-and-back spurs where the trace runs up a side
  road and returns; MapLibre's fill tessellator turns each of those into a stray triangle streaking
  across the polygon. Cut the spurs before committing.

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
rather than picking one and hoping — see the `metrowest-portishead` entry.

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
- No rail line geometry — MetroWest Phase 1 (Portishead line) has no route drawn; its marker sits
  at Pill, midway along.
- **`cycle_infra` is thin.** Only `railway-path-barriers` and `feeder-promenade` sit in it. Most
  live cycle provision in Bristol is delivered *inside* corridor and Liveable Neighbourhood schemes
  (the Hawkfield Road two-way track, Redcliffe Way's Temple Meads–Queen Square track, Bond Street's
  parallel quiet route) and is categorised there rather than duplicated.

  `railway-path-barriers` bends two rules deliberately, both flagged in the entry itself. Its works
  are on the **South Gloucestershire** section of the path (Siston Common to Bitton), outside the
  city — kept because the Railway Path is a primary Bristol commuting corridor. And its `sourceUrl`
  is a WECA **news post**, which Rule 2 normally rejects: South Gloucestershire's consultation
  closed at the end of January 2026 and its page is no longer reachable, so the February 2026
  funding announcement is the best surviving summary. Swap it for a proper scheme page if one
  appears.

  The **Active Travel Fund 4** quietways — Deanery Road, Filwood, Malago Greenway and Old Market
  (St Matthias Park to Lawrence Hill roundabout) — are **not** entries because they fail Rule 2:
  consultation ran in early 2024, they're still awaiting a funding bid for detailed design, and
  `ask.bristol.gov.uk/active-travel-fund-4-schemes` now 404s. Add them when a live page exists.

- **`public/data/metrobus_network.geojson` is now unreferenced** after the MetroBus entry was
  removed (see "Deliberately excluded"). `scripts/fetch-osm-routes.mjs` still fetches it. Left in
  place rather than deleted, in case the network is wanted back as a context map layer rather than
  a project entry.

- **No geometry for most newer entries.** The schemes added in the 2026-07-30 pass are point
  markers only, apart from `feeder-promenade`; corridor lines would need OSM route extraction or a
  published scheme boundary.

## Deliberately excluded

Kept here so they don't get re-added by the next curation pass:

- **Liveable Neighbourhoods programme (overview)** — BCC's hub page indexing each LN microsite.
  An index, not a scheme; the individual LNs are listed on their own.
- **Bike Bristol** — unofficial campaign group tracking cycle infrastructure rollout. A useful
  cross-check against official sources, but a news tracker rather than a project, and not
  authoritative. Worth consulting when curating; not an entry.

Both fail Rule 1: they're places to read about mobility changes, not mobility changes.

### Completed before 2024

The list tracks change that is still in prospect or in progress, so schemes finished before 2024
are out regardless of how well they meet the three rules. Removed on that basis:

- **MetroBus network & Joint Local Transport Plan** — the m1–m4 network was delivered in phases and
  finished long before the cut-off: m3 opened 29 May 2018, m2 on 3 September 2018, m1 on 6 January
  2019 and m4 on 22 January 2023. JLTP4 rode along in the same entry; the adopted-plan link now
  hangs off `we-mass-transit` instead. Any *future* MetroBus extension is a separate scheme — see
  `m1-metrobus-extension`, which is under construction and stays.
- **Malago Greenway** and **Filwood Quietway** — delivered under the Cycle Ambition Fund, 2015–2018.
  Travelwest's pages for both are explicitly archives of completed work. Their ATF4 follow-on
  upgrades are a different, unfunded scheme (above).

Anything whose completion date is genuinely unclear should keep its real status and stay, rather
than being removed on a guess — check the source before cutting.

## Development

```bash
npm install
npm run dev
```
