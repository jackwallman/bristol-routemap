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

  `cycle_network.geojson` has had 27 "Proposed"/"Planned" features removed (2026-08-28) where
  `PROG_STATU` (the programme-stage field) contradicts `R_STATUS`: "Scheme complete / No
  improvements identified" on a segment marked as still Proposed or Planned. All were unnamed and
  clustered at short lengths (0.01–4km) — stale records rather than live proposals. Existing and
  Aspirational segments weren't touched. If re-fetching via `fetch-opendata.mjs`, re-apply this
  filter (or check whether BCC's own data has since cleaned it up).

  `feeder_promenade.geojson` and `filwood_broadway_cycle_route.geojson` aren't from Overpass —
  they're individual segments matched by `ROUTE_NAME` directly out of `cycle_network.geojson`
  (Proposed "Feeder Road (Promenade)" and Planned "Filwood Quietway" respectively), used because
  no OSM route exists for either yet. `filwood_broadway_cycle_route.geojson` deliberately keeps
  only one of the three "Filwood Quietway"-labelled Planned segments in the dataset — the one whose
  location (Hartcliffe Road–Airport Road) matches the funded reCREATE Filwood scheme; the other two
  run south into Hartcliffe/Symes Avenue with no matching published scheme (see "Not yet built").

- **`public/data/{a4_portway,bus_route_2,metrobus_network,portishead_line,henbury_line,m1_extension,hawkfield_cycle_path,temple_way,bond_street,bond_street_cycle_route,bedminster_bridges,redcliffe_way,redcliffe_way_cycle_track,broadmead,railway_path_barriers,bristol_school_streets}.geojson`**
  (OpenStreetMap, via Overpass) — real road/route geometry for corridor projects that have no
  dataset on Open Data Bristol. Bus Route 2 and MetroBus m1–m4 are unambiguous OSM route relations
  (First West of England / Metrobus, matched by `ref` + `network` tag). The Portishead Branch Line
  and the Henbury Line have no route relation, so they're matched by Network Rail's line code
  instead (ways tagged `ref=POD` and `ref=AFR` respectively) — for Portishead this also excludes
  the disused, unrelated Weston, Clevedon & Portishead Light Railway; for Henbury, the fetched ways
  are further filtered by way ID down to the Filton–Henbury section the new passenger service
  actually uses, since the AFR freight line continues past Henbury to Avonmouth Docks. The m1
  MetroBus extension is under construction and has no route relation either, so it's a hand-picked
  chain of street ways (Hengrove Park Leisure Centre → William Jessop Way → Hawkfield Road →
  Imperial Retail Park), with the Hawkfield Road cycle path written out separately as the segment
  of Hawkfield Road the works cover.

  The five bristolonthemove.com city-centre schemes and the Railway Path barrier removal follow
  the same two patterns. Where a scheme sits on one clearly-named street (or a short chain of
  directly-adjoining named streets), it's a plain name+bbox search, same as A4 Portway — Temple
  Way; Bond Street/Newfoundland Circus/Newfoundland Road; Union Street/The Horsefair/Penn Street
  for Broadmead; and the Bristol & Bath Railway Path bounded to the Siston Common–Bitton Station
  works extent (rather than the whole Bristol–Bath route relation). Bedminster Bridges is the same
  idea but needs two extra fixes, both caught by checking the rendered line against the scheme's
  own published plan diagrams rather than trusting the query output: Redcliff Hill and Bedminster
  Parade don't actually join in OSM — the roundabout and twin bridges over the New Cut between them
  carry a separate name, `Bedminster Bridge Roundabout` (with the bridge decks themselves tagged
  `bridge=yes`), so a hand-picked way-ID chain bridges the gap the same way the m1 extension's does;
  and East Street's name+bbox search was pulling in ~500m more of the street than the plan shows,
  so its bbox is trimmed to stop just past the Dalby Avenue junction near Asda. "Redcliffe Way",
  "Redcliffe Roundabout" and
  "Redcliffe Street" all turn out to be tagged as one continuous `name=Redcliffe Way` in OSM, so
  that's a single-name search too. Where a scheme's own cycle track is described separately from
  its parent road works — Redcliffe Way's track (Redcliff Hill added to the parent's own
  Redcliffe Way ways, the same "reuse the parent's ways" trick as Hawkfield Road) and Bond
  Street's replacement route (Pembroke Street → Portland Square → Wilson Street) — it's a
  hand-picked way-ID chain. Portland Square is one closed-loop OSM way for the whole one-way
  square, so `bond_street_cycle_route.geojson` trims it to just the south arc actually being
  changed, with the same `trimAtNearestNode` helper the Hawkfield Road/William Jessop Way trim
  uses. Redcliffe Way's cycle track deliberately stops short at both ends — Temple Meads and Queen
  Square — rather than drawing an approximate final stretch: OSM has no named way for either the
  "Brunel Mile" pedestrian route or a specific Queen Square approach street, only the square's full
  perimeter road, which would misrepresent the track as looping the square.

  Bristol School Streets (`bristol_school_streets.geojson`) is a different shape: 21 independent
  schemes, each closing a named street (or short chain of streets) outside one school's gates, so
  the output is 21 scattered short segments across the city rather than one corridor. Street names
  and boundary junctions are read off each school's own Travelwest page (one page per school,
  linked from the index page), not the summary page itself. Most are a plain name+bbox search per
  school; where a scheme's own page names a sub-section of a longer street (Chester Park Junior's
  Abingdon Road, St Werburgh's Mogg Street, Whitehall's Johnsons Lane/Road, Minerva's The
  Greenway/Cherry Tree Crescent, Glenfrome's Sir John's Lane, Oasis Marksbury Road's Oakhill Drive)
  the bbox is tightened to that section's own boundary junctions, the same "let the bbox pick out
  just the way segments in that span" technique East Street and the Railway Path use, rather than
  hand-picking way IDs. OSM tags "Sir John's Lane" both with and without the apostrophe, so both
  spellings are queried. Re-fetch everything with:

  ```bash
  node scripts/fetch-osm-routes.mjs
  ```

  or pass a section name (`portway`, `bus2`, `metrobus`, `portishead`, `m1`, `henbury`,
  `temple-way`, `bond-street`, `bedminster-bridges`, `redcliffe-way`, `broadmead`, `railway-path`,
  `school-streets`) to refresh one output without re-fetching the rest — `bond-street` also
  refreshes `bond_street_cycle_route.geojson` and `redcliffe-way` also refreshes
  `redcliffe_way_cycle_track.geojson`, since each pair is fetched together. Overpass is a shared
  public resource — this script deliberately fetches one relation at a time with a delay between
  requests. Don't parallelize it or run it in a tight loop. `school-streets` is resumable: schools
  already present in the output file are skipped on re-run, so a run that dies partway (Overpass's
  public instances are occasionally all down at once) can just be re-run rather than starting over.

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
- **`cycle_infra` entries that are cycle-specific parts of a bigger road/bus scheme are split out
  as their own entry**, cross-referenced both ways in the description, rather than described twice
  at length inside the parent corridor entry. `hawkfield-cycle-path` (split from
  `m1-metrobus-extension`), `redcliffe-way-cycle-track` (split from `redcliffe-way`) and
  `bond-street-cycle-route` (split from `bond-street`) all follow this pattern. Do the same for any
  future scheme that bundles a distinct cycle alignment inside a corridor project.

  `railway-path-barriers` bends two rules deliberately, both flagged in the entry itself. Its works
  are on the **South Gloucestershire** section of the path (Siston Common to Bitton), outside the
  city — kept because the Railway Path is a primary Bristol commuting corridor. And its `sourceUrl`
  is a WECA **news post**, which Rule 2 normally rejects: South Gloucestershire's consultation
  closed at the end of January 2026 and its page is no longer reachable, so the February 2026
  funding announcement is the best surviving summary. Swap it for a proper scheme page if one
  appears.

  The **Active Travel Fund 4** quietways — Deanery Road, Filwood (St John's Lane/Wedmore Vale
  extension), Malago Greenway and Old Market (Old Market Roundabout via Redcross Street, Braggs
  Lane and Trinity Street to Lawrence Hill roundabout) — are **not** entries because they fail Rule
  2: consultation ran in early 2024, they're still awaiting a funding bid for detailed design, and
  `ask.bristol.gov.uk/active-travel-fund-4-schemes` still 404s (re-checked 2026-08-28; also true of
  the community-run `oldmarketca.co.uk`, whose domain no longer resolves). Add them when a live page
  exists. Note this ATF4 Filwood extension is a **different, still-unfunded** scheme from
  `filwood-broadway-cycle-route` below — that one's funded by the Levelling Up Fund, this one isn't.

- **`public/data/metrobus_network.geojson` is now unreferenced** after the MetroBus entry was
  removed (see "Deliberately excluded"). `scripts/fetch-osm-routes.mjs` still fetches it. Left in
  place rather than deleted, in case the network is wanted back as a context map layer rather than
  a project entry.

- **Small "Proposed"/"Planned" segments in the cycle network with no matching published scheme**
  (checked 2026-08-28, all `NEW_CLASSI` "Not BCC" or "CP" except Inns Court): Inns Court, Saltwall
  Avenue, Lime Trees Road Link, "Filton Keynes" (an odd combined name — plausibly a data entry
  issue; sits near Kings Weston/Henbury, not Filton) and Keynsham. None have a page describing what
  would actually change — fails Rule 3. Also excluded on the same basis: a 3.1km "Planned" segment
  labelled "Promenade" (programme code CP-BR2) running along the River Avon between St Anne's and
  Conham — geographically and by name distinct from `feeder-promenade`'s Feeder Canal alignment in
  St Philip's Marsh (programme code CP-A2), despite the similar name.

- **Schemes researched this pass that turned out to already be finished, cancelled, or otherwise
  covered** (checked 2026-08-28), kept here so they aren't re-investigated from scratch next time:
  - **Old City & King Street pedestrianisation** (King Street + Queen Charlotte Street, segregated
    cycle path to Baldwin Street/Queen Square) — all five phases were scheduled to finish by
    October 2025; its page (`.../king-street-pedestrianisation`) is still live but describes a
    completed programme with nothing further in prospect.
  - **Cotham Hill permanent scheme** — the Transport and Connectivity Committee decided 5 February
    2026 *not* to proceed; its consultation page now 404s.
  - **Park Row / Perry Road / Upper Maudlin Street / Colston Street** — completed early 2025 (£3.1m
    Active Travel Fund); its project page has since been taken down.
  - **Princess Victoria Street permanent pedestrianisation** — the £655k permanent scheme (paving,
    landscaping, gates) was substantially complete by mid-2025.
  - **A4018 Passage Road ↔ Charlton Road** — a segregated cycle lane and peak-hour bus lanes here
    are already covered by `bus-route-2`'s geometry (both streets are named ways within
    `bus_route_2.geojson`); no separate entry needed. The Charlton Road walking/cycling element
    specifically (tied to the YTL Arena Bristol development) awaited a decision as of the survey
    report (autumn 2024–winter 2025) — worth a dedicated entry if it produces its own funded scheme.

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
