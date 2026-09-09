import type { RailLine, Station } from "../types/rail";

// Station coordinates fetched from OpenStreetMap via scripts/fetch-osm-routes.mjs
// rail-stations -> public/data/rail_stations.geojson, hand-copied here so ids stay
// stable across re-fetches. The query covers open stations (railway=station|halt) and
// stations that are only planned or being built (proposed:/construction:railway), so
// every coordinate here is a surveyed OSM node sitting on the track rather than an
// eyeballed position from a scheme's publicity map.
export const stations: Station[] = [
  { id: "bristol-temple-meads", name: "Bristol Temple Meads", crs: "BRI", coordinates: [-2.5804029, 51.4490991] },
  { id: "lawrence-hill", name: "Lawrence Hill", crs: "LWH", coordinates: [-2.56417, 51.45858] },
  { id: "stapleton-road", name: "Stapleton Road", crs: "SRD", coordinates: [-2.5663184, 51.467446] },
  // Opened 2024-09-28 — an operational station, not a MetroWest aspiration, even though it
  // was delivered under the same programme and will also be served by the planned Henbury line.
  { id: "ashley-down", name: "Ashley Down", crs: "ASD", coordinates: [-2.5766511, 51.4781307] },
  { id: "montpelier", name: "Montpelier", crs: "MTP", coordinates: [-2.5881158, 51.4683357] },
  { id: "redland", name: "Redland", crs: "RDA", coordinates: [-2.5989091, 51.4683779] },
  { id: "clifton-down", name: "Clifton Down", crs: "CFN", coordinates: [-2.6114362, 51.4644315] },
  { id: "sea-mills", name: "Sea Mills", crs: "SML", coordinates: [-2.6496514, 51.4795006] },
  { id: "shirehampton", name: "Shirehampton", crs: "SHH", coordinates: [-2.6789317, 51.4842773] },
  { id: "portway-park-and-ride", name: "Portway Park & Ride", crs: "PRI", coordinates: [-2.6875586, 51.4881079] },
  { id: "avonmouth", name: "Avonmouth", crs: "AVN", coordinates: [-2.6988623, 51.4997221] },
  { id: "st-andrews-road", name: "St Andrews Road", crs: "SAR", coordinates: [-2.6964411, 51.5124477] },
  { id: "severn-beach", name: "Severn Beach", crs: "SVB", coordinates: [-2.6645392, 51.5596758] },
  { id: "keynsham", name: "Keynsham", crs: "KYN", coordinates: [-2.4958797, 51.418071] },
  { id: "oldfield-park", name: "Oldfield Park", crs: "OLF", coordinates: [-2.3801536, 51.379209] },
  { id: "bath-spa", name: "Bath Spa", crs: "BTH", coordinates: [-2.3567189, 51.3776019] },
  { id: "bedminster", name: "Bedminster", crs: "BMT", coordinates: [-2.5936286, 51.4406058] },
  { id: "parson-street", name: "Parson Street", crs: "PSN", coordinates: [-2.6085368, 51.432994] },
  { id: "nailsea-and-backwell", name: "Nailsea & Backwell", crs: "NLS", coordinates: [-2.7496898, 51.4196718] },
  { id: "yatton", name: "Yatton", crs: "YAT", coordinates: [-2.8277046, 51.3908826] },
  { id: "filton-abbey-wood", name: "Filton Abbey Wood", crs: "FIT", coordinates: [-2.563826, 51.503393] },
  { id: "bristol-parkway", name: "Bristol Parkway", crs: "BPW", coordinates: [-2.542979, 51.5138815] },
  { id: "yate", name: "Yate", crs: "YAE", coordinates: [-2.4321734, 51.5413993] },
  { id: "patchway", name: "Patchway", crs: "PWY", coordinates: [-2.5623447, 51.5258271] },
  { id: "pilning", name: "Pilning", crs: "PIL", coordinates: [-2.6267285, 51.556377] },
  { id: "severn-tunnel-junction", name: "Severn Tunnel Junction", crs: "STJ", coordinates: [-2.7772968, 51.584253] },
  { id: "caldicot", name: "Caldicot", crs: "CDT", coordinates: [-2.7597685, 51.5845063] },

  // Planned (MetroWest, "underway" per src/data/projects.ts) — no platform built yet and no
  // allocated CRS code, so no `crs`, which is what marks a station as planned throughout the
  // UI. Coordinates are the OSM proposed:/construction:railway=station nodes for each site
  // (North Filton is tagged there as "Bristol Brabazon", CRS BBZ once allocated); all four sit
  // within a few metres of the alignment. Re-check if a Full Business Case moves a site.
  { id: "pill", name: "Pill", coordinates: [-2.6869069, 51.4812677] },
  { id: "portishead", name: "Portishead", coordinates: [-2.7561519, 51.4834666] },
  { id: "north-filton", name: "North Filton (Brabazon)", coordinates: [-2.5809286, 51.5175324] },
  { id: "henbury", name: "Henbury", coordinates: [-2.6185806, 51.5146306] },
];

// Headways are minutes between departures, per day-type and daypart. Sourced from each
// line's page below by reading the stated frequency, not estimated — where a source gives
// one blanket figure for the whole day (most do; GB suburban timetables are not usually
// published broken down this finely), the same figure is used for every daypart in that
// day-type rather than inventing a peak/off-peak split the source doesn't support. Where a
// figure is inferred rather than read directly, that's noted on the line.
export const lines: RailLine[] = [
  // Bristol-Avonmouth trains run every 30 min most of the week; alternate trains beyond
  // Avonmouth terminate there, so the Severn Beach end only gets every other one (hourly).
  // Modelled as two lines sharing the Avonmouth node so that taper is represented honestly,
  // rather than giving every station on the branch the same (wrong) headway.
  {
    id: "severn-beach-inner",
    name: "Severn Beach Line (Temple Meads–Avonmouth)",
    stations: [
      "bristol-temple-meads",
      "lawrence-hill",
      "stapleton-road",
      "montpelier",
      "redland",
      "clifton-down",
      "sea-mills",
      "shirehampton",
      "portway-park-and-ride",
      "avonmouth",
    ],
    legMinutes: [3, 2, 3, 2, 2, 5, 4, 3, 4],
    headways: {
      weekday: { early: 30, am_peak: 30, midday: 30, pm_peak: 30, evening: 30 },
      saturday: { early: 30, am_peak: 30, midday: 30, pm_peak: 30, evening: 30 },
      // Sunday has no Avonmouth-terminating extras, so it drops to the same hourly
      // through-service as the outer section below, not the weekday/Saturday 30 min.
      sunday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
    },
    sourceName: "TravelWest: Severn Beach Line",
    sourceUrl: "https://travelwest.info/rail/severn-beach-line/",
    lastUpdated: "2026-09-07",
  },
  {
    id: "severn-beach-outer",
    name: "Severn Beach Line (Avonmouth–Severn Beach)",
    stations: ["avonmouth", "st-andrews-road", "severn-beach"],
    legMinutes: [6, 5],
    headways: {
      weekday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
      saturday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
      sunday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
    },
    sourceName: "South Gloucestershire Council: increased train frequency for Severn Beach",
    sourceUrl:
      "https://sites.southglos.gov.uk/newsroom/transport/increased-train-frequency-for-severn-beach-station-celebrated",
    lastUpdated: "2026-09-07",
  },

  // GWR states "around 4 services an hour" Temple Meads-Bath Spa, but several of those are
  // fast/non-stop and skip Keynsham and Oldfield Park; the stopping pattern those two
  // stations actually get is roughly half that. Modelled at the stopping-service rate
  // (30 min) so the two intermediate stations aren't shown as better served than they are.
  // Sunday early is confirmed null: the GWR journey planner's first Sunday departure is
  // 09:41, after this map's "early" band ends.
  {
    id: "bristol-bath",
    name: "Bristol–Bath Line",
    stations: ["bristol-temple-meads", "keynsham", "oldfield-park", "bath-spa"],
    legMinutes: [9, 6, 3],
    headways: {
      weekday: { early: 30, am_peak: 30, midday: 30, pm_peak: 30, evening: 30 },
      saturday: { early: 30, am_peak: 30, midday: 30, pm_peak: 30, evening: 30 },
      sunday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
    },
    sourceName: "GWR: Bristol to Bath",
    sourceUrl: "https://www.gwr.com/stations-and-destinations/popular-routes/bristol-to-bath",
    lastUpdated: "2026-09-07",
  },

  // Wikipedia: local + fast services combine to "a half-hourly service between Bristol
  // Temple Meads and Weston-super-Mare throughout much of the day" — no day-type or exact
  // time-of-day breakdown given, so weekday and Saturday are both modelled at that flat
  // figure. Sunday isn't stated; set to 60 as the typical GWR suburban Sunday thinning
  // pattern — unconfirmed, re-check against a live Sunday timetable.
  {
    id: "bristol-weston",
    name: "Weston-super-Mare Line (Bristol section)",
    stations: ["bristol-temple-meads", "bedminster", "parson-street", "nailsea-and-backwell", "yatton"],
    legMinutes: [4, 3, 13, 5],
    headways: {
      weekday: { early: 60, am_peak: 30, midday: 30, pm_peak: 30, evening: 60 },
      saturday: { early: 60, am_peak: 30, midday: 30, pm_peak: 30, evening: 60 },
      sunday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
    },
    sourceName: "Wikipedia: Bristol–Exeter line",
    sourceUrl: "https://en.wikipedia.org/wiki/Bristol%E2%80%93Exeter_line",
    lastUpdated: "2026-09-07",
  },

  // Hansard (Jan 2023): the Bristol-Gloucester stopping service "currently" hourly, with a
  // campaign (now MetroWest Phase 2's ambition) to get it to half-hourly. Some Bristol
  // Parkway/Yate journeys get a second, faster CrossCountry train that skips Filton Abbey
  // Wood, so those two stations alone are somewhat better served than modelled here — this
  // uses the hourly stopping-service figure that actually applies to Filton Abbey Wood, the
  // more representative case. Sunday not confirmed in sources; treated as unchanged from
  // weekday pending a live-timetable re-check.
  {
    id: "bristol-gloucester",
    name: "Bristol–Gloucester Line (to Yate)",
    stations: ["bristol-temple-meads", "filton-abbey-wood", "bristol-parkway", "yate"],
    legMinutes: [9, 5, 11],
    headways: {
      weekday: { early: 60, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
      saturday: { early: 60, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
      sunday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
    },
    sourceName: "Hansard: Train Services, South Gloucestershire",
    sourceUrl:
      "https://hansard.parliament.uk/commons/2023-01-18/debates/4414182C-7053-4A4A-A2A3-54489D1BC647/TrainServicesSouthGloucestershire",
    lastUpdated: "2026-09-07",
  },

  // The local shuttle that serves Ashley Down, which opened in September 2024. GWR's station
  // page states it plainly: "served in each direction by hourly services between Bristol Temple
  // Meads and Filton Abbey Wood from Monday to Saturday, with limited services on Sundays",
  // calling additionally at Stapleton Road and Lawrence Hill. It runs the same Filton Bank
  // tracks as the Gloucester and South Wales services but has its own, much more local calling
  // pattern, so it's modelled separately rather than folded into bristol-gloucester.
  //
  // Leg times and the Sunday figure are read off the public timetable listing rather than
  // GWR's prose, which only says "limited": Sunday has six trains each way (10:11, 11:17,
  // 13:25, 14:21, 16:20, 18:23 northbound), so nothing before 09:30 or after 19:00 and gaps of
  // up to ~2 hours in between — hence 120, the longest realistic wait, per the README rule.
  // Weekday/Saturday evenings are hourly until a final train around 21:30, a ~76 min gap that
  // the hourly figure understates slightly.
  {
    id: "bristol-filton-local",
    name: "Bristol–Filton Abbey Wood local (via Ashley Down)",
    stations: ["bristol-temple-meads", "lawrence-hill", "stapleton-road", "ashley-down", "filton-abbey-wood"],
    legMinutes: [3, 2, 3, 4],
    headways: {
      weekday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
      saturday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
      sunday: { early: null, am_peak: null, midday: 120, pm_peak: 120, evening: null },
    },
    sourceName: "GWR: Ashley Down station",
    sourceUrl: "https://www.gwr.com/stations-and-destinations/stations/new-stations/ashley-down",
    lastUpdated: "2026-09-09",
  },

  // Wikipedia (Severn Tunnel Junction): GWR service toward Bristol/Taunton runs hourly on
  // weekdays, Saturdays AND Sundays — one of the few lines here with a fully-confirmed,
  // uniform figure across all three day types.
  {
    id: "south-wales-main-line",
    name: "South Wales Main Line (Bristol–Cardiff)",
    stations: [
      "bristol-temple-meads",
      "filton-abbey-wood",
      "patchway",
      "pilning",
      "severn-tunnel-junction",
      "caldicot",
    ],
    legMinutes: [9, 4, 6, 9, 5],
    headways: {
      weekday: { early: 60, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
      saturday: { early: 60, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
      sunday: { early: 60, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
    },
    sourceName: "Wikipedia: Severn Tunnel Junction railway station",
    sourceUrl: "https://en.wikipedia.org/wiki/Severn_Tunnel_Junction_railway_station",
    lastUpdated: "2026-09-07",
  },

  // MetroWest Phase 1 (Portishead line, underway — see metrowest-portishead in projects.ts).
  // A half-hourly service was the original 2016 proposal but was found unaffordable in that
  // business case; public statements since point to an hourly service at reopening. No
  // confirmed operational timetable exists yet (line isn't open), so this is the best public
  // estimate, not a read timetable — re-check once GWR publishes a live timetable.
  {
    id: "portishead",
    name: "Portishead Line (planned, MetroWest Phase 1)",
    stations: ["bristol-temple-meads", "bedminster", "parson-street", "pill", "portishead"],
    legMinutes: [4, 3, 9, 6],
    headways: {
      weekday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
      saturday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
      sunday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
    },
    serviceStatus: "planned",
    sourceName: "TravelWest: Portishead rail line (MetroWest Phase 1)",
    sourceUrl: "https://travelwest.info/projects/portishead-rail-line-metrowest-phase-1/",
    lastUpdated: "2026-09-07",
  },

  // MetroWest Phase 2 (Henbury line, underway — see metrowest-henbury-line in projects.ts).
  // A half-hourly option was studied and found technically feasible but unaffordable; the
  // funded plan is hourly. Ashley Down is already open and already has trains (see
  // bristol-filton-local above); GWR's station page says this line will call there too, so it
  // stays on both. The shared Temple Meads-Ashley Down-Filton Abbey Wood legs use the times
  // measured off the running shuttle rather than a separate estimate. Not open yet — same
  // caveat as Portishead above.
  {
    id: "henbury",
    name: "Henbury Line (planned, MetroWest Phase 2)",
    stations: ["bristol-temple-meads", "ashley-down", "filton-abbey-wood", "north-filton", "henbury"],
    legMinutes: [8, 4, 4, 6],
    headways: {
      weekday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
      saturday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
      sunday: { early: null, am_peak: 60, midday: 60, pm_peak: 60, evening: 60 },
    },
    serviceStatus: "planned",
    sourceName: "TravelWest: Henbury rail line (MetroWest Phase 2)",
    sourceUrl: "https://travelwest.info/projects/henbury-rail-line-metrowest-phase-2/",
    lastUpdated: "2026-09-07",
  },
];

export const stationsById: Record<string, Station> = Object.fromEntries(
  stations.map((s) => [s.id, s]),
);
