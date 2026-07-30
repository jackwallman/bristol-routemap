import type { Project } from "../types/project";

// Curated project list. NOT scraped — each entry is written from its source page and
// re-checked periodically; `lastUpdated` is the staleness indicator.
//
// Entries must satisfy the three rules in CLAUDE.md / README.md: they change how people
// move about the city, `sourceUrl` is the best summary page for that scheme, and the
// description says what is changing and why it's an improvement (provenance notes last).
export const projects: Project[] = [
  {
    id: "east-bristol-ln",
    name: "East Bristol Liveable Neighbourhood",
    area: "Barton Hill / Redfield / St George",
    category: "liveable_neighbourhood",
    status: "underway",
    description:
      "Trial scheme filtering through-traffic out of residential East Bristol. Bus gates on Avonvale Road (at Marsh Lane, and at Pile Marsh), modal filters and pocket parks on Beaufort Road, Barnes Street, Cobden Street and Ducie Road/Barton Hill Road, planters, cycle hangars and new crossings around Crews Hole. Every street keeps car access — you just can't drive through, so traffic shortcutting to Church Road (A420) and Summerhill Road (A431) is removed. That speeds up the number 5 bus, cuts traffic on the school routes along Beaufort Road, and links walking and cycling routes towards City Academy, Church Road and the Bristol to Bath Railway Path. Trial measures installed spring 2025; public engagement and monitoring reported December 2025; the Transport and Connectivity Committee decides on a permanent layout during 2026. Boundary polygon is the Open Data Bristol dataset.",
    sourceName: "East Bristol Liveable Neighbourhood (BCC)",
    sourceUrl:
      "https://www.bristol.gov.uk/ask/projects/east-bristol-liveable-neighbourhood",
    extraLinks: [
      {
        name: "Measure-by-measure detail",
        url: "https://www.bristol.gov.uk/ask/projects/east-bristol-liveable-neighbourhood/individual-neighbourhood-improvements",
      },
    ],
    lastUpdated: "2026-07-30",
    coordinates: [-2.5545, 51.4595],
    geometryUrl: "/data/eastbristol_ln_boundary.geojson",
    geometryType: "polygon",
  },
  {
    id: "south-bristol-ln",
    name: "South Bristol Liveable Neighbourhoods",
    area: "Southville / Bedminster / Windmill Hill / Totterdown",
    category: "liveable_neighbourhood",
    status: "proposed",
    description:
      "Proposed area-wide scheme across 11 neighbourhoods in Southville, Bedminster, Ashton Vale, Malago Vale, Windmill Hill and part of Totterdown, with Southville, Bedminster East and Totterdown as phase 1. Residential streets keep vehicle access to every road but discourage or prevent through-traffic and lower speeds; 11 parking areas gain Residents' Parking, Matchday Parking (around Ashton Gate) or both. The case for it is measured, not assumed: ANPR surveys found 10–13% of traffic in Southville was shortcutting through — roughly 650–1,450 vehicles. Removing that makes residential streets safer to walk, wheel and cycle on and frees kerb space for residents rather than commuters and matchday parkers. Consultation ran 4 September to 30 October 2025; the report was published 5 May 2026 and a decision is still to come. No official GIS boundary is published — the highlighted area is traced along real road centrelines (Coronation Road, Ashton Road, Winterstoke Road, Bedminster Down Road, Bedminster Road, Saint John's Lane, Wells Road, via OpenStreetMap) to match BCC's published study-area map, with short straight bridges at complex junctions. Not survey-accurate.",
    sourceName: "South Bristol Liveable Neighbourhoods (BCC)",
    sourceUrl:
      "https://www.bristol.gov.uk/ask/projects/south-bristol-liveable-neighbourhood",
    extraLinks: [
      {
        name: "Detailed proposals",
        url: "https://www.bristol.gov.uk/ask/projects/south-bristol-liveable-neighbourhood/sbln-proposals",
      },
    ],
    lastUpdated: "2026-07-30",
    coordinates: [-2.5975, 51.4375],
    geometryUrl: "/data/south_bristol_ln_boundary.geojson",
    geometryType: "polygon",
  },
  {
    id: "bus-route-2",
    name: "Bus Route 2 corridor",
    area: "A37 / A4018 (Stockwood ↔ Cribbs Causeway)",
    category: "major_corridor",
    status: "underway",
    description:
      "Bus priority and street improvements along the number 2's corridor on the A37 and A4018, plus public realm work and better crossings for people on foot, wheeling and cycling. The aim is more reliable bus journeys end-to-end rather than a faster single junction, making the switch from driving worthwhile and easing congestion and air quality on two of the city's busiest radial roads. Construction updates are published on the project page. The highlighted line is the route's actual path via OpenStreetMap (Cribbs Causeway ↔ Stockwood) — useful for orientation, but which sections are built versus still to come needs checking against the construction updates.",
    sourceName: "Bus Route 2 (Bristol on the Move)",
    sourceUrl: "https://bristolonthemove.com/project/bus-route-2/",
    lastUpdated: "2026-07-30",
    coordinates: [-2.5975, 51.4550],
    geometryUrl: "/data/bus_route_2.geojson",
    geometryType: "line",
  },
  {
    id: "a4-portway-corridor",
    name: "A4 Portway corridor",
    area: "Avon Gorge / Portway (Sea Mills to city centre)",
    category: "major_corridor",
    status: "underway",
    description:
      "Transport corridor scheme on the A4 Portway: new 24-hour bus lanes, reduced speed limits, junction improvements, and more green space and tree planting where the gorge allows. Because the bus lanes run around the clock rather than at peak only, buses stay out of queues on the main western approach into the city all day, which makes journey times predictable; the speed and junction work is what makes the route usable on foot and by bike rather than a motor-traffic-only corridor. Weeknight resurfacing between Hotwell Road and Park Road ran 27 July to 26 October 2026. The highlighted line is the Portway's real road geometry via OpenStreetMap, Cumberland Basin out to Sea Mills.",
    sourceName: "A4 Portway (Bristol on the Move)",
    sourceUrl: "https://bristolonthemove.com/project/a4-portway/",
    lastUpdated: "2026-07-30",
    coordinates: [-2.6480, 51.4820],
    geometryUrl: "/data/a4_portway.geojson",
    geometryType: "line",
  },
  {
    id: "city-centre-changes",
    name: "City Centre transport transformation",
    area: "City centre (Broadmead, Redcliffe, Temple, Bedminster Bridges, Bond Street)",
    category: "major_corridor",
    status: "underway",
    description:
      "Umbrella programme reworking the centre's streets ahead of major housing and retail development, delivered as five schemes: Broadmead, Redcliffe Way, Temple Way, Bedminster Bridges and Bond Street. Twenty-five bus services move off Broadmead's busiest shopping streets from 30 August 2026, and the road layout is being prepared for a mostly segregated rapid transit route between Long Ashton Park & Ride and UWE's Frenchay campus running through the centre. The point is to stop the centre working as a place buses and through-traffic grind across: taking buses off pedestrian-heavy shopping streets speeds them up and makes Broadmead walkable, while Temple Way and Bedminster Bridges fix the walking, wheeling and cycling approaches into the centre from Temple Meads and south Bristol. No single route or boundary to draw, so this stays a point marker.",
    sourceName: "City Centre (Bristol on the Move)",
    sourceUrl: "https://bristolonthemove.com/project/city-centre/",
    lastUpdated: "2026-07-30",
    coordinates: [-2.5966, 51.4536],
  },
  {
    id: "metrobus-jltp",
    name: "MetroBus network & Joint Local Transport Plan",
    area: "West of England (regional)",
    category: "rail_metrobus",
    status: "completed",
    description:
      "The region's built rapid transit network, run by WECA/Travelwest rather than BCC: m1 (Cribbs Causeway ↔ Hengrove Park), m2 (Long Ashton P&R ↔ city centre), m3/m3x (Emersons Green ↔ city centre) and m4 (Cribbs Causeway ↔ city centre). Segregated busway sections and limited stops make cross-city and park-and-ride journeys substantially quicker than the local bus services on the same corridors, with twin-door boarding and off-bus ticketing at stop iPoints cutting dwell time. Listed here as delivered context for the corridors above — network map current from 5 April 2026, and further expansion is signposted by Travelwest but not tracked in this entry. The JLTP4 is the 2020–2036 strategic plan adopted by WECA and the four councils that sets the regional policy behind these schemes; its rail-enhancement element has no route geometry to show here. Highlighted lines are the four OSM route relations.",
    sourceName: "MetroBus network (Travelwest)",
    sourceUrl: "https://travelwest.info/metrobus/",
    extraLinks: [
      {
        name: "JLTP4 2020–2036 (WECA)",
        url: "https://www.westofengland-ca.gov.uk/what-we-do/transport/joint-local-transport-plan/",
      },
    ],
    lastUpdated: "2026-07-30",
    coordinates: [-2.5400, 51.4800],
    geometryUrl: "/data/metrobus_network.geojson",
    geometryType: "line",
  },
];
