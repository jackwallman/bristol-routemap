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
    startDate: "Spring 2025",
    endDate: "Permanence decision due 2026",
    highlights: [
      "Bus gates on Avonvale Road, modal filters and pocket parks across Beaufort Road, Barnes Street, Cobden Street and Ducie Road",
      "Every street keeps car access — only through-traffic is removed",
      "Speeds up the number 5 bus and cuts school-run traffic on Beaufort Road",
      "Currently a trial; Transport and Connectivity Committee decides on a permanent layout in 2026",
    ],
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
    highlights: [
      "Area-wide scheme across 11 neighbourhoods in Southville, Bedminster, Ashton Vale, Malago Vale and Windmill Hill",
      "Every road keeps vehicle access; through-traffic is discouraged or prevented and speeds lowered",
      "ANPR surveys found 10–13% of Southville traffic was shortcutting through — 650–1,450 vehicles",
      "Consultation ran Sep–Oct 2025; report published May 2026, decision still to come",
    ],
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
    highlights: [
      "Bus priority and street improvements along the whole A37/A4018 corridor, not just one junction",
      "Public realm work and better crossings for people on foot, wheeling and cycling",
      "Aim is reliable end-to-end journeys, easing congestion and air quality on two of the city's busiest radial roads",
    ],
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
    highlights: [
      "New 24-hour bus lanes keep buses out of queues on the main western approach all day",
      "Reduced speed limits and junction improvements make the route usable on foot and by bike",
      "More green space and tree planting where the gorge allows",
      "Weeknight resurfacing between Hotwell Road and Park Road ran 27 Jul–26 Oct 2026",
    ],
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
    endDate: "Buses off Broadmead from 30 Aug 2026",
    highlights: [
      "Umbrella programme covering five schemes: Broadmead, Redcliffe Way, Temple Way, Bedminster Bridges and Bond Street",
      "25 bus services move off Broadmead's busiest shopping streets from 30 August 2026",
      "Road layout prepared for a mostly segregated rapid transit route through the centre",
      "Speeds up buses, makes Broadmead walkable, and fixes walking/cycling approaches from Temple Meads and south Bristol",
    ],
    coordinates: [-2.5966, 51.4536],
  },
  {
    id: "broadmead",
    name: "Broadmead",
    area: "Broadmead / Old City",
    category: "major_corridor",
    status: "proposed",
    description:
      "Reworking Broadmead's streets and public spaces ahead of roughly 5,000 more people living in and travelling around the area. Walking, wheeling and cycling routes are made safer and more direct, bus movement improves, and the layout is set up for the planned rapid transit route across the city. Groundwork is already visible nearby: the Old City is pedestrianised, most through traffic is gone and Bristol Bridge has been reconfigured. The point is that a shopping district absorbing thousands of new residents can't also work as a through-route — this reallocates the space before the demand arrives rather than after.",
    sourceName: "Broadmead (Bristol on the Move)",
    sourceUrl: "https://bristolonthemove.com/project/broadmead/",
    lastUpdated: "2026-07-30",
    highlights: [
      "Reworks Broadmead's streets and public spaces ahead of ~5,000 more people living in the area",
      "Safer, more direct walking, wheeling and cycling routes; improved bus movement",
      "Sets up the layout for the planned citywide rapid transit route",
      "Follows on from Old City pedestrianisation and the Bristol Bridge reconfiguration",
    ],
    coordinates: [-2.5890, 51.4575],
  },
  {
    id: "redcliffe-way",
    name: "Redcliffe Way",
    area: "Redcliffe Way / Redcliffe Roundabout / Redcliffe Street",
    category: "major_corridor",
    status: "proposed",
    description:
      "Rebuild of Redcliffe Way, Redcliffe Roundabout and Redcliffe Street: wider decluttered pavements, signalised crossings across the roundabout, a separated cycle track linking Temple Meads to Queen Square and Redcliff Hill, extended bus lanes, new bus gates on Redcliffe Street, a new Phippen Street junction keeping general traffic access via Victoria Street, upgraded shelters with real-time information, and a 20mph limit. Extending the bus lanes completes a loop around the city centre, which means people can change buses without first travelling into the middle — a network change, not just a faster segment. The Redcliffe Street bus gates are what make a future Long Ashton Park & Ride ↔ Union Street ↔ UWE Frenchay rapid transit route possible.",
    sourceName: "Redcliffe Way (Bristol on the Move)",
    sourceUrl: "https://bristolonthemove.com/project/redcliffe-way/",
    lastUpdated: "2026-07-30",
    highlights: [
      "Wider decluttered pavements and signalised crossings across Redcliffe Roundabout",
      "Separated cycle track linking Temple Meads to Queen Square and Redcliff Hill",
      "Extended bus lanes complete a loop around the city centre, so people can change buses without going into the middle",
      "New bus gates on Redcliffe Street enable a future rapid transit route to UWE Frenchay",
    ],
    coordinates: [-2.5895, 51.4492],
  },
  {
    id: "temple-way",
    name: "Temple Way",
    area: "Temple Way (Old Market to Temple Meads)",
    category: "major_corridor",
    status: "underway",
    description:
      "Construction is under way on Temple Way from its northern end down to the Friary junction just before Temple Meads, including a change to Old Market Roundabout and the bus stops north of it. The work makes buses along Temple Way more reliable and improves safety and access for people walking and cycling — this is the main approach between the station and the city centre, so its severance is what currently pushes people onto buses they then can't rely on.",
    sourceName: "Temple Way (Bristol on the Move)",
    sourceUrl: "https://bristolonthemove.com/project/temple-way/",
    lastUpdated: "2026-07-30",
    highlights: [
      "Construction under way from the northern end down to the Friary junction near Temple Meads",
      "Changes to Old Market Roundabout and the bus stops north of it",
      "Makes buses more reliable and improves safety for people walking and cycling on the main station-to-centre approach",
    ],
    coordinates: [-2.5850, 51.4540],
  },
  {
    id: "bedminster-bridges",
    name: "Bedminster Bridges",
    area: "Bedminster Bridges / Bedminster Parade / Redcliff Hill",
    category: "major_corridor",
    status: "proposed",
    description:
      "Removes the Bedminster Bridges roundabout and makes each bridge two-way — one for buses only, one for general traffic — with separate cycle paths, quicker crossings, more pavement space and high-quality paving. Splitting buses onto their own bridge takes them out of the roundabout queue entirely rather than giving them priority within it, and the crossing changes fix what is currently a hostile gap between south Bristol and the centre. This is the main gateway from Bedminster, Southville and the rest of south Bristol into the city centre.",
    sourceName: "Bedminster Bridges (Bristol on the Move)",
    sourceUrl: "https://bristolonthemove.com/project/bedminster-bridges/",
    lastUpdated: "2026-07-30",
    highlights: [
      "Removes the roundabout; each bridge becomes two-way — one bus-only, one general traffic",
      "Separate cycle paths, quicker crossings and more pavement space",
      "Buses come off the roundabout queue entirely rather than getting priority within it",
      "Main gateway from Bedminster, Southville and south Bristol into the city centre",
    ],
    coordinates: [-2.5935, 51.4452],
  },
  {
    id: "bond-street",
    name: "Bond Street",
    area: "St James Barton Roundabout / Bond Street / Newfoundland Circus",
    category: "major_corridor",
    status: "proposed",
    description:
      "Proposed bus lanes in both directions on Bond Street, covering the east side of St James Barton Roundabout, the Bond Street South junction, Newfoundland Circus and Newfoundland Road, to speed up buses between the roundabout and the M32. The outbound bus lane takes the space of the existing on-road cycle lane, which is replaced by a two-way cycle route on quieter parallel streets — worth knowing if you currently ride Bond Street, since the trade-off is a slower, calmer alignment in exchange for bus priority on the main carriageway.",
    sourceName: "Bond Street (Bristol on the Move)",
    sourceUrl: "https://bristolonthemove.com/project/bond-street/",
    lastUpdated: "2026-07-30",
    highlights: [
      "Bus lanes in both directions on Bond Street, speeding buses between St James Barton Roundabout and the M32",
      "Covers the roundabout's east side, Bond Street South junction, Newfoundland Circus and Newfoundland Road",
      "Existing on-road cycle lane is replaced by a two-way route on quieter parallel streets",
    ],
    coordinates: [-2.5855, 51.4600],
  },
  {
    id: "metrowest-portishead",
    name: "MetroWest Phase 1: Portishead line",
    area: "Portishead / Pill / Bristol Temple Meads",
    category: "rail_metrobus",
    status: "underway",
    description:
      "Reopening 14km of disused railway between Portishead and Bristol to passenger service, with new stations at Portishead and Pill and car parking, plus service improvements on the Severn Beach and Bath lines. It connects around 50,000 people to the rail network who have no station today and improves services for a further 180,000 living within 1km of existing stations — Portishead is currently a town of that size reachable only by a congested road. The Department for Transport approved it in July 2025; early works started autumn 2025 with main construction from spring/summer 2026, and trains are expected to run hourly to Temple Meads from 2028. Delivered jointly by WECA and North Somerset Council. Highlighted line is the branch's real track geometry via OpenStreetMap (ways tagged ref=POD, Network Rail's code for the line), Portishead to its junction with the Bristol–Exeter mainline near Parson Street — a mix of railway=rail and railway=construction (track currently being relaid for reopening).",
    sourceName: "MetroWest Phase 1 (Travelwest)",
    sourceUrl: "https://travelwest.info/projects/portishead-rail-line-metrowest-phase-1/",
    extraLinks: [
      {
        name: "Network Rail: the Portishead Line",
        url: "https://www.networkrail.co.uk/our-work/our-routes/western/the-portishead-line/",
      },
    ],
    lastUpdated: "2026-07-31",
    startDate: "Autumn 2025 (early works)",
    endDate: "Hourly trains from 2028",
    highlights: [
      "Reopens 14km of disused railway between Portishead and Bristol, with new stations at Portishead and Pill",
      "Connects ~50,000 people to the rail network with no station today; improves services for a further 180,000",
      "Approved by the DfT July 2025; main construction from spring/summer 2026",
      "Delivered jointly by WECA and North Somerset Council",
    ],
    coordinates: [-2.6890, 51.4790],
    geometryUrl: "/data/portishead_line.geojson",
    geometryType: "line",
  },
  {
    id: "metrowest-henbury-line",
    name: "MetroWest Phase 2: Henbury line",
    area: "Filton / Horfield / Southmead / Henbury",
    category: "rail_metrobus",
    status: "underway",
    description:
      "Reopens the freight-only Filton–Henbury branch (Network Rail's Avonmouth and Filton Railway, no passenger trains since 1964) to an hourly Bristol Temple Meads ↔ Henbury service calling at Lawrence Hill, Stapleton Road, Ashley Down, Filton Abbey Wood and two new stations: Bristol Brabazon and Henbury. Ashley Down opened 27 September 2024. Bristol Brabazon — built on the former Filton Airfield and renamed from 'North Filton' in March 2026 — opens in two stages: a smaller Stage 1 station in autumn 2026 to serve the growing Brabazon neighbourhood (6,500 homes, 30,000 jobs) and its new arena, then a fuller station alongside Henbury's single-platform stop in March 2028. It puts a station within reach of Filton, Horfield, Southmead and Henbury for the first time, and gets Brabazon's rail link built ahead of its residents rather than after. Full Business Case for both new stations approved October 2025; delivered by WECA with Network Rail, Bristol City Council, South Gloucestershire Council and North Somerset Council funding. Point marker at Bristol Brabazon, the next station due to open. Highlighted line is the branch's real track geometry via OpenStreetMap (ways tagged ref=AFR, Network Rail's code for the Avonmouth and Filton Railway), clipped by way ID to the Filton–Henbury section the new passenger service will actually run over — the freight line continues several more km past Henbury to Avonmouth Docks, which stays freight-only and isn't drawn.",
    sourceName: "Bristol Brabazon & Henbury stations (Travelwest)",
    sourceUrl:
      "https://travelwest.info/projects/bristol-brabazon-and-henbury-train-stations/",
    extraLinks: [
      {
        name: "Bristol Brabazon station construction updates (Network Rail)",
        url: "https://www.networkrail.co.uk/our-work/our-routes/western/metrowest-rail-upgrades/bristol-brabazon-station/",
      },
    ],
    lastUpdated: "2026-08-18",
    startDate: "Ashley Down opened Sep 2024",
    endDate: "Bristol Brabazon & Henbury full stations, Mar 2028",
    highlights: [
      "Reopens the Filton–Henbury freight branch to hourly Bristol Temple Meads ↔ Henbury passenger trains",
      "Two new stations: Bristol Brabazon (former Filton Airfield, opening autumn 2026) and Henbury (Mar 2028)",
      "Ashley Down, the line's third new station, already opened 27 September 2024",
      "Gives Filton, Horfield, Southmead and Henbury a station where none exists today",
    ],
    coordinates: [-2.5840, 51.5145],
    geometryUrl: "/data/henbury_line.geojson",
    geometryType: "line",
  },
  {
    id: "metrowest-charfield",
    name: "MetroWest Phase 2: Charfield station",
    area: "Charfield (South Gloucestershire)",
    category: "rail_metrobus",
    status: "underway",
    description:
      "New station in the centre of Charfield, on the Bristol–Gloucester line, which lost its last station in 1965. Hourly trains each way will put roughly 14,500 residents within three miles of the rail network for the first time in 60 years — about 32 minutes to Bristol Temple Meads, 22 to Gloucester — part of MetroWest Phase 2's wider move to half-hourly Bristol–Gloucester services via Yate. Construction started August 2025; platforms and the footbridge were in place by May 2026, and opening is due spring 2027. £41.7m funded by WECA via the City Region Sustainable Transport Settlement, delivered by South Gloucestershire Council with Network Rail and contractor Octavius. Charfield sits well outside Bristol's boundary, but is included as part of the Bristol–Gloucester commuter corridor Phase 2 upgrades.",
    sourceName: "New Charfield station (South Gloucestershire Council)",
    sourceUrl:
      "https://sites.southglos.gov.uk/newsroom/transport/new-charfield-station-will-connect-thousands-in-local-villages-to-the-national-rail-network",
    startDate: "Construction started Aug 2025",
    endDate: "Opening spring 2027",
    highlights: [
      "New station in Charfield, on the Bristol–Gloucester line, which lost its last station in 1965",
      "Hourly trains each way — ~32 minutes to Bristol Temple Meads, 22 to Gloucester",
      "Puts ~14,500 residents within three miles of the rail network for the first time in 60 years",
      "Part of MetroWest Phase 2's move to half-hourly Bristol–Gloucester services via Yate",
    ],
    extraLinks: [
      {
        name: "Construction progress update, May 2026 (WECA)",
        url: "https://www.westofengland-ca.gov.uk/news/new-charfield-station-on-track-to-open-in-spring-2027/",
      },
    ],
    lastUpdated: "2026-08-18",
    coordinates: [-2.3980, 51.6825],
  },
  {
    id: "m1-metrobus-extension",
    name: "m1 MetroBus extension & active travel improvements",
    area: "Hengrove Park / Hawkfield Road / Imperial Retail Park",
    category: "rail_metrobus",
    status: "underway",
    description:
      "Extends the m1 MetroBus beyond Hengrove Park Leisure Centre to Imperial Retail Park via the new William Jessop Way housing and along Hawkfield Road, with MetroBus shelters, real-time displays, raised platforms for step-free boarding and strengthened concrete pads at stops. Alongside it: a two-way cycle path on Hawkfield Road separated from both pavement and carriageway, new and upgraded pedestrian crossings including zebras at side roads and one near Petherton Road, traffic calming, e-scooter and e-bike parking, and cycle stands at stops. It pushes the rapid transit network into a part of south Bristol that new housing is being added to, so the residents arrive with the connection already there. Construction started early January 2026 at the northern end of Hawkfield Road, working south in phases to Butterfly Lane, with completion expected autumn 2026.",
    sourceName: "m1 extension (Bristol City Council)",
    sourceUrl:
      "https://www.bristol.gov.uk/residents/streets-travel/transport-plans-and-projects/metrobus-bus-rapid-transit-brt/m1-metrobus-extension-and-active-travel-improvements",
    lastUpdated: "2026-07-30",
    startDate: "Jan 2026",
    endDate: "Autumn 2026 (expected)",
    highlights: [
      "Extends the m1 MetroBus from Hengrove Park Leisure Centre to Imperial Retail Park",
      "Two-way cycle path on Hawkfield Road, separated from both pavement and carriageway",
      "New pedestrian crossings, traffic calming, and step-free MetroBus boarding platforms",
      "Brings the rapid transit network to a part of south Bristol where new housing is being built",
    ],
    coordinates: [-2.5945, 51.4140],
  },
  {
    id: "we-mass-transit",
    name: "West of England mass transit",
    area: "West of England (regional) — city centre to Bristol Airport",
    category: "rail_metrobus",
    status: "proposed",
    description:
      "WECA's Transport Vision, published February 2026, commits the region to building mass transit — light rail, trams or tram-like vehicles on segregated roadways, with multiple doors, low floors and high capacity. Two initial concepts are named: Redcliffe Way in Bristol, and a link to Bristol Airport, which is the only regional airport in the country with no fixed transit connection and currently reachable only by road 16km from the centre. The West is the largest city-region in the UK without mass transit or a commitment to build it, so this is the gap-closing move rather than an incremental upgrade. Leaders have committed to start construction within four to five years of the announcement, with £752m secured for buses, trains and mass transit planning and 250+ new green buses arriving by the end of 2026. Note this vision post-dates JLTP4 — the 2020–2036 Joint Local Transport Plan adopted by WECA and the four councils, still the formally adopted plan — and a follow-on Transport Strategy is in development.",
    sourceName: "Transport Vision (WECA)",
    sourceUrl:
      "https://www.westofengland-ca.gov.uk/news/a-transport-network-you-can-trust-the-wests-new-transport-vision/",
    extraLinks: [
      {
        name: "JLTP4 2020–2036 (WECA)",
        url: "https://www.westofengland-ca.gov.uk/what-we-do/transport/joint-local-transport-plan/",
      },
    ],
    lastUpdated: "2026-07-30",
    startDate: "Construction from ~2030 (target, per WECA's 4–5 year commitment)",
    highlights: [
      "WECA's Transport Vision (Feb 2026) commits the region to light rail or tram-like mass transit",
      "Two initial concepts named: Redcliffe Way in Bristol, and a link to Bristol Airport",
      "The West is the largest UK city-region without mass transit or a commitment to build it",
      "£752m secured for buses, trains and mass transit planning; 250+ new green buses by end of 2026",
    ],
    coordinates: [-2.7191, 51.3827],
  },
  {
    id: "bristol-school-streets",
    name: "Bristol School Streets",
    area: "Citywide (16 primary schools, more in consultation)",
    category: "liveable_neighbourhood",
    status: "underway",
    description:
      "Timed closures of the streets immediately outside school entrances at opening and closing times, with only walking, wheeling, cycling and scooting allowed through and exemptions for emergency vehicles and Blue Badge holders. Sixteen Bristol primary schools have live schemes. It targets the specific problem that the school gate is most dangerous exactly when children are arriving, and that the danger is largely caused by the school run itself — removing the vehicles for those two short windows is what makes walking or cycling to school a reasonable choice. Our Lady of the Rosary (Lawrence Weston), Glenfrome (Eastville), Oasis Academy Marksbury Road (Bedminster) and May Park (Eastville) consulted on joining, closing 23 March 2026. Citywide, so it stays a point marker; each school has its own Travelwest page.",
    sourceName: "Bristol School Streets (Travelwest)",
    sourceUrl: "https://travelwest.info/projects/bristol-school-streets/",
    lastUpdated: "2026-07-30",
    highlights: [
      "Timed closures of streets outside school entrances at opening and closing times",
      "Only walking, wheeling, cycling and scooting allowed through, plus emergency/Blue Badge exemptions",
      "16 primary schools have live schemes; four more consulted on joining, closing 23 March 2026",
      "Removes the school-run traffic that makes the gate most dangerous exactly when children arrive",
    ],
    coordinates: [-2.5750, 51.4700],
  },
  {
    id: "railway-path-barriers",
    name: "Bristol & Bath Railway Path: barrier removal, lighting & CCTV",
    area: "Staple Hill / Warmley / Oldland Common / Bitton",
    category: "cycle_infra",
    status: "approved",
    description:
      "Removing or altering the barriers that create pinch points at nine locations between Siston Common and Bitton Station: Siston Common, near the A4174 ring road, Station Close and the A420 crossing in Warmley, Meadow Court Drive and School Road in Oldland Common, by Cherry Gardens play area, and the north and south car parks at Bitton Station. Also 20 CCTV cameras between Staple Hill Tunnel and the former Mangotsfield Station plus two at Warmley Waiting Room, and a lighting scheme from Siston Hill roundabout to Warmley Waiting Room designed to limit impact on wildlife. The barriers are what currently decide who can use the path at all — the narrow gateways shut out mobility scooters, wheelchairs, pushchairs and non-standard cycles from Bristol's main traffic-free commuter route, so widening them changes the route's reach rather than just its comfort. Led by South Gloucestershire Council with £450,000+ from WECA via the City Region Sustainable Transport Settlement and Economic Development Fund. Consultation closed end of January 2026; funding was allocated in February 2026 and detailed plans are in development. Note the works are on the South Gloucestershire section of the path, outside the city boundary — included because it's a primary Bristol commuting corridor. No route geometry drawn; the marker sits mid-section near Warmley.",
    sourceName: "Railway Path funding (WECA)",
    sourceUrl:
      "https://www.westofengland-ca.gov.uk/news/funding-allocated-for-improvements-on-bristol-and-bath-railway-path/",
    lastUpdated: "2026-07-30",
    highlights: [
      "Removes or alters pinch-point barriers at nine locations between Siston Common and Bitton Station",
      "Opens the path to mobility scooters, wheelchairs, pushchairs and non-standard cycles currently shut out",
      "20 CCTV cameras and a wildlife-conscious lighting scheme from Siston Hill to Warmley Waiting Room",
      "Funded Feb 2026 with £450,000+ from WECA; construction start not yet confirmed",
    ],
    coordinates: [-2.4600, 51.4460],
  },
  {
    id: "feeder-promenade",
    name: "Feeder Promenade",
    area: "St Philip's Marsh (Feeder Canal, Temple Quarter)",
    category: "cycle_infra",
    status: "proposed",
    description:
      "A continuous walking and cycling path proposed along the Feeder Canal in St Philip's Marsh, separated from traffic as part of a wider 'promenade' street type in the area's masterplan. The canal is currently a working industrial waterway with no public path alongside it; the promenade would open it up as a car-free through-route linking the new St Philip's Marsh neighbourhood to Temple Meads and the city centre, with flood defences designed into the landscaping rather than left as a barrier to access. This is an early masterplan commitment rather than a funded, dated scheme — the wider St Philip's Marsh site is expected to be developed over 10 to 20 years — so treat the alignment as indicative. Part of the Temple Quarter regeneration alongside Temple Meads station's Southern Gateway and the Victoria Street works on Bus Route 2. Line drawn is the proposed Feeder Road corridor segment from Open Data Bristol's cycle network dataset.",
    sourceName: "St Philip's Marsh (Bristol City Council)",
    sourceUrl: "https://www.bristol.gov.uk/ask/projects/temple-quarter/st-philips-marsh",
    lastUpdated: "2026-07-31",
    highlights: [
      "Continuous car-free walking and cycling path proposed along the Feeder Canal in St Philip's Marsh",
      "Opens up a currently-inaccessible working industrial waterway as a through-route",
      "Links the new St Philip's Marsh neighbourhood to Temple Meads and the city centre",
      "Early masterplan commitment, not a funded/dated scheme — site expected to develop over 10–20 years",
    ],
    coordinates: [-2.573087, 51.449384],
    geometryUrl: "/data/feeder_promenade.geojson",
    geometryType: "line",
  },
];
