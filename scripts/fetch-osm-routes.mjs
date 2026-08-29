// Fetches real road/bus-route geometry from OpenStreetMap via the Overpass API
// (free, no key) for corridor projects that don't have geometry published on
// Open Data Bristol. Run with: node scripts/fetch-osm-routes.mjs
// Pass a section name to refresh just one output without re-fetching the rest:
// node scripts/fetch-osm-routes.mjs m1   (sections: portway, bus2, metrobus, portishead, m1,
// henbury, temple-way, bond-street, redcliffe-way, bedminster-bridges, broadmead, railway-path,
// school-streets, rail-network)
//
// Data is © OpenStreetMap contributors, ODbL — see https://www.openstreetmap.org/copyright
// Overpass is a shared public resource: this script fetches one relation at a
// time with a delay between requests. Don't parallelize it.

import { readFileSync, writeFileSync } from "node:fs";

// Public Overpass instances, tried in order — the main one 504s when overloaded.
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpassQuery(query) {
  let lastError;
  for (const url of OVERPASS_URLS) {
    try {
      // overpass-api.de rejects header-less fetch() calls with HTTP 406
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "get-about-bristol (transport project map; occasional manual re-fetch)",
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (res.ok) return res.json();
      lastError = new Error(`Overpass HTTP ${res.status} from ${url}`);
    } catch (err) {
      lastError = err;
    }
    console.warn(`  ${lastError.message ?? lastError} from ${url}, trying next instance`);
    await sleep(2000);
  }
  throw lastError;
}

function waysToGeoJSON(elements, extraProps = {}) {
  const ways = elements.filter((e) => e.type === "way" && e.geometry);
  return {
    type: "FeatureCollection",
    features: ways.map((w) => ({
      type: "Feature",
      properties: { osm_id: w.id, name: w.tags?.name, ref: w.tags?.ref, ...extraProps },
      geometry: {
        type: "LineString",
        coordinates: w.geometry.map((pt) => [pt.lon, pt.lat]),
      },
    })),
  };
}

// A4 Portway: named way segments tagged A4 within a bbox covering the Avon Gorge corridor.
const portwayQuery = `
[out:json][timeout:30];
(
  way["name"="Portway"]["highway"](51.44,-2.70,51.51,-2.58);
);
out geom;
`;

// First West of England bus route 2 (Cribbs Causeway <-> Stockwood), one direction.
// Relation id found via: relation["route"="bus"]["ref"="2"](51.40,-2.70,51.51,-2.50);
const bus2Query = `
[out:json][timeout:30];
relation(id:287401);
out body;
>;
out geom qt;
`;

// MetroBus m1-m4, one direction each. Relation ids found via:
// relation["route"="bus"]["network"~"MetroBus",i](51.35,-2.75,51.55,-2.45);
const metrobusRelations = {
  m1: 17619171,
  m2: 10071091,
  m3: 17614341,
  m4: 17618876,
};

// Portishead Branch Line (MetroWest Phase 1): no OSM route relation exists for
// it, so this matches individual ways by Network Rail's line code (ref=POD)
// rather than a name search, which also picks up the disused/adjacent Weston,
// Clevedon & Portishead Light Railway (ref=WCA). Includes railway=rail and
// railway=construction (track currently being relaid for reopening).
const portisheadLineQuery = `
[out:json][timeout:60];
(
  way["ref"="POD"]["railway"~"rail|construction"](51.40,-2.80,51.51,-2.50);
);
out geom;
`;

// m1 MetroBus extension (Hengrove Park Leisure Centre -> Imperial Retail Park) and the
// Hawkfield Road cycle path built alongside it. The extension is under construction, so
// no OSM route relation exists yet; the corridor is hand-picked street ways instead:
// Hengrove Promenade (existing terminus) -> The Boulevard -> William Jessop Way ->
// Butterfly Lane -> Hawkfield Road -> Hartcliffe Way link -> Hengrove Way Roundabout ->
// Hengrove Way (one carriageway) -> Wills Way to the Imperial Retail Park entrance.
// Re-check the alignment against the council page if the way IDs ever stop matching.
const m1ExtensionWayIds = [
  // Hengrove Promenade
  137812679, 178375602, 178375616, 182930299, 1470017825,
  // The Boulevard
  137816743, 137816744, 143700363, 178375604, 178375613, 1367349910, 1367349911,
  1458314807, 1458314808, 1458314809,
  // William Jessop Way (192976609 is trimmed at the Butterfly Lane junction below)
  192966059, 192976616, 192976609,
  // Butterfly Lane
  1123537426,
  // Hawkfield Road (trimmed at the Butterfly Lane junction below)
  106895617,
  // Hartcliffe Way link between Hawkfield Road and the Hengrove Way Roundabout
  40780756, 293489974,
  // Hengrove Way Roundabout, just the arc the route crosses
  203136414,
  // Hengrove Way, westbound: named carriageway stub, then the unnamed trunk link and
  // connector that join Wills Way's south end without a gap
  23422044, 23422048, 23422051,
  // Wills Way up to the Imperial Retail Park entrance
  628420425, 23422052,
];

const m1ExtensionQuery = `
[out:json][timeout:30];
way(id:${m1ExtensionWayIds.join(",")});
out geom;
`;

// The works run along Hawkfield Road between the Hengrove Way roundabout and Butterfly
// Lane, so ways that continue past a junction are cut at the node nearest to it.
const BUTTERFLY_LANE_ON_HAWKFIELD = [-2.59336, 51.40774];
const BUTTERFLY_LANE_ON_JESSOP = [-2.59164, 51.40761];

function trimAtNearestNode(feature, [lon, lat], keep) {
  const coords = feature.geometry.coordinates;
  let best = 0;
  let bestDist = Infinity;
  coords.forEach(([cLon, cLat], i) => {
    const d = (cLon - lon) ** 2 + (cLat - lat) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  feature.geometry.coordinates =
    keep === "start" ? coords.slice(0, best + 1) : coords.slice(best);
}

// Henbury Line (MetroWest Phase 2): matched by Network Rail's line code
// (ref=AFR, "Avonmouth and Filton Railway", currently freight-only) the same
// way the Portishead line is. Clipped by explicit way ID to the Filton-Henbury
// section the new passenger service will actually run over — the freight line
// continues several more km past Henbury to Avonmouth Docks, which stays
// freight-only and isn't part of this scheme. Way IDs found via:
// way["ref"="AFR"]["railway"~"rail|construction"](51.44,-2.70,51.53,-2.55);
// then manually filtered to those east of Henbury (lon >= -2.652).
const henburyLineWayIds = [
  3811884, 3994993, 4758479, 26390259, 85270457, 267053355, 310314820,
  678488585, 678488586, 678488587, 678488590, 906775016, 906775017, 1359147113,
];
const henburyLineQuery = `
[out:json][timeout:60];
way(id:${henburyLineWayIds.join(",")});
out geom;
`;

// City centre schemes (bristolonthemove.com). Each of these is a real named street or a short
// chain of adjoining named streets, so — like A4 Portway — a plain name+bbox search is enough;
// no hand-picked way IDs needed unless noted otherwise.

// Temple Way: single dual-carriageway street, Old Market Roundabout to the Friary junction.
const templeWayQuery = `
[out:json][timeout:30];
(
  way["name"="Temple Way"]["highway"](51.449,-2.586,51.456,-2.582);
);
out geom;
`;

// Bond Street scheme: the bus-lane corridor named in the project page — Bond Street itself,
// Newfoundland Circus and Newfoundland Road out towards the M32 — is one connected chain of
// named ways, so a single bbox'd name search picks up exactly that corridor.
const bondStreetQuery = `
[out:json][timeout:30];
(
  way["name"="Bond Street"]["highway"](51.458,-2.591,51.467,-2.575);
  way["name"="Newfoundland Circus"]["highway"](51.458,-2.591,51.467,-2.575);
  way["name"="Newfoundland Road"]["highway"](51.458,-2.591,51.467,-2.575);
);
out geom;
`;

// Bond Street's replacement cycle route (bond-street-cycle-route): Pembroke Street, the south
// side of Portland Square, and Wilson Street, per the project page's "Cycle route on quieter
// streets" section. Portland Square is a one-way loop road split into many OSM ways; way
// 72343243 is the whole loop as a single closed way, so it's trimmed to just the south arc
// (Pembroke Street to Wilson Street) rather than drawing the full square.
const bondStreetCycleWayIds = [
  // Pembroke Street
  4234842,
  // Portland Square: the one-way loop (trimmed below) plus the short link ways to Wilson Street
  72343243, 692748721, 235296249,
  // Wilson Street
  72343225,
];
const bondStreetCycleQuery = `
[out:json][timeout:30];
way(id:${bondStreetCycleWayIds.join(",")});
out geom;
`;
const PORTLAND_SQUARE_WEST_CORNER = [-2.58592, 51.46072];

// Bedminster Bridges scheme: Redcliff Hill and Bedminster Parade run north-south into the
// roundabout, then East Street continues south from it — but Redcliff Hill and Bedminster Parade
// don't actually join up in OSM: the roundabout and twin bridges over the New Cut between them are
// tagged name="Bedminster Bridge Roundabout", a separate name, not "Redcliff Hill"/"Bedminster
// Parade" (confirmed against the scheme's own published plan diagrams, which show the twin bridges
// as part of the works). East Street's south bound is tightened to 51.4413 (just north of the
// Dalby Avenue junction) — the untrimmed bbox picks up ~500m more of East Street than the plan
// shows, well past where the works actually stop near Asda; Redcliff Hill and Bedminster Parade's
// own bboxes are unaffected by this.
const bedminsterBridgesQuery = `
[out:json][timeout:30];
(
  way["name"="Redcliff Hill"]["highway"](51.440,-2.601,51.449,-2.589);
  way["name"="Bedminster Parade"]["highway"](51.440,-2.601,51.449,-2.589);
  way["name"="East Street"]["highway"](51.4413,-2.601,51.449,-2.589);
);
out geom;
`;

// The roundabout/bridge ways connecting Redcliff Hill's south end to Bedminster Parade's north
// end, hand-picked (same technique as the m1 extension) by tracing OSM's "Bedminster Bridge
// Roundabout"-named segments from Redcliff Hill's endpoint (-2.59124, 51.44604) to Bedminster
// Parade's endpoint (-2.59126, 51.44522) — the west side of the roundabout, including the two
// way segments tagged bridge=yes that are the actual bridge deck over the New Cut. Re-check by
// re-running the BFS in this file's git history if these way IDs stop matching.
const bedminsterBridgeRoundaboutWayIds = [
  203633552, 34639889, 121381299, 1506069633, 34639888, 180662477, 39020138,
];
const bedminsterBridgeRoundaboutQuery = `
[out:json][timeout:30];
way(id:${bedminsterBridgeRoundaboutWayIds.join(",")});
out geom;
`;

// Redcliffe Way scheme: "Redcliffe Way", "Redcliffe Roundabout" and "Redcliffe Street" are all
// tagged name="Redcliffe Way" in OSM (no separate "Redcliffe Street"/"Redcliffe Roundabout" way
// names exist), so one name+bbox search covers the whole corridor from Redcliff Hill in the west
// to Temple Circus/Victoria Street in the east.
const redcliffeWayQuery = `
[out:json][timeout:30];
(
  way["name"="Redcliffe Way"]["highway"](51.447,-2.594,51.450,-2.583);
);
out geom;
`;

// Redcliffe Way's separated cycle track (redcliffe-way-cycle-track): the project page describes
// it running the length of Redcliffe Way/the roundabout, plus onward links towards Queen Square
// and along Redcliff Hill to Bedminster Bridges (south) that the bus/traffic corridor above
// doesn't include. Reuses the same Redcliffe Way ways as the parent corridor (the cycle track
// literally runs alongside/on the road, same as the Hawkfield Road cycle path reuses the m1
// extension's Hawkfield Road segment) plus Redcliff Hill. The Queen Square end is NOT drawn: the
// source only says the track runs "alongside the pedestrian route between Temple Meads and Queen
// Square (Brunel Mile)" with no named street given, and OSM's only "Queen Square" way is the
// square's full four-sided perimeter road — fetching it would draw the track looping the whole
// square, which the source doesn't support. Same reasoning as the Temple Meads end, which is
// also left undrawn for lack of a matching "Brunel Mile" way in OSM.

// Broadmead scheme: the streets losing through-traffic — Union Street, The Horsefair and Penn
// Street — form one connected chain (Union Street's north end is the access into The Horsefair
// the scheme closes; The Horsefair's north end continues directly into Penn Street).
const broadmeadQuery = `
[out:json][timeout:30];
(
  way["name"="Union Street"]["highway"](51.454,-2.593,51.459,-2.585);
  way["name"="The Horsefair"]["highway"](51.454,-2.593,51.459,-2.585);
  way["name"="Penn Street"]["highway"](51.454,-2.593,51.459,-2.585);
);
out geom;
`;

// Bristol & Bath Railway Path barrier removal, lighting and CCTV: the whole path is a single
// named way (tagged highway=cycleway, railway=abandoned) split into many segments, so a
// name+bbox search bounded to the works extent — Siston Common down to Bitton Station — picks
// up exactly that section without needing the wider Bristol-to-Bath route relation.
const railwayPathQuery = `
[out:json][timeout:30];
(
  way["name"~"Railway Path",i]["highway"](51.406,-2.483,51.466,-2.449);
);
out geom;
`;

// Bristol School Streets: each launched/proposed scheme closes a named street (or short chain of
// streets) immediately outside its school gates. Streets and boundary junctions come from each
// school's own Travelwest project page (travelwest.info/projects/bristol-school-streets-*); bboxes
// are hand-picked per school (school coordinate ± a few hundred metres, or the two boundary
// junctions ± a small buffer for streets whose closure is only *part* of a longer road) using the
// same "let a tight bbox pick out just the OSM way segments in that span" technique as East Street
// and the Railway Path barrier removal — most residential streets here are split into several way
// IDs at each side junction, so bounding the query to the closure's own junctions is enough without
// hand-picking way IDs. "Cherry Tree Crescent" is OSM's spelling (Travelwest's page drops the
// space); everything else matches the source page's own street names.
const schoolStreetGroups = [
  { school: "Wansdyke Primary School", streets: ["School Close"], bbox: [51.4006, -2.5899, 51.4126, -2.5699] },
  { school: "St Peter's CofE Primary School", streets: ["Ellfield Close"], bbox: [51.4108, -2.632, 51.4228, -2.612] },
  { school: "Redfield Educate Together Primary Academy", streets: ["Victoria Avenue"], bbox: [51.4518, -2.5654, 51.4638, -2.5454] },
  { school: "Victoria Park Primary School", streets: ["Atlas Road", "Raymend Road"], bbox: [51.4308, -2.5981, 51.4428, -2.5781] },
  // Abingdon Road, bounded to just the Moorlands Road-Acton Road span the source names.
  { school: "Chester Park Junior School", streets: ["Abingdon Road"], bbox: [51.4712, -2.533, 51.474, -2.5295] },
  // The Greenway (Hillfields Avenue-Summerleaze) and Cherry Tree Crescent (The Greenway-Cherry
  // Tree Road), both bounded to the spans the source names.
  { school: "Minerva Primary Academy", streets: ["The Greenway", "Cherry Tree Crescent"], bbox: [51.4708, -2.5185, 51.4756, -2.5138] },
  // Johnsons Lane and Johnsons Road, each bounded at the physical-barrier junction the source
  // names (Oakleigh Avenue, Stepney Road); Woodcroft Avenue is unbounded (no trim named).
  { school: "Whitehall Primary School", streets: ["Johnsons Lane", "Johnsons Road", "Woodcroft Avenue"], bbox: [51.4625, -2.558, 51.466, -2.552] },
  { school: "Cathedral Primary School and Bristol Cathedral Choir School", streets: ["College Square"], bbox: [51.4472, -2.6064, 51.4552, -2.5944] },
  { school: "St Bernadette Catholic Primary School", streets: ["Gladstone Road"], bbox: [51.4101, -2.5739, 51.4221, -2.5539] },
  { school: "Ashley Down Primary School", streets: ["Olveston Road"], bbox: [51.4776, -2.5952, 51.4896, -2.5752] },
  { school: "Fair Furlong Primary School", streets: ["Vowell Close"], bbox: [51.4017, -2.6215, 51.4137, -2.6015] },
  { school: "Ashton Gate Primary School", streets: ["Upton Road"], bbox: [51.4369, -2.6196, 51.4489, -2.5996] },
  // Mogg Street, bounded to the James Street-Cleave Street span the source names; John Street
  // unbounded.
  { school: "St Werburgh's Primary School", streets: ["Mogg Street", "John Street"], bbox: [51.4685, -2.576, 51.4705, -2.5725] },
  { school: "Oasis Academy Bank Leaze", streets: ["Corbet Close"], bbox: [51.5015, -2.6616, 51.5135, -2.6416] },
  { school: "Headley Park Primary School", streets: ["Headley Park Avenue"], bbox: [51.414, -2.619, 51.426, -2.599] },
  { school: "Shirehampton Primary School", streets: ["Springfield Avenue"], bbox: [51.4858, -2.6845, 51.4888, -2.6745] },
  { school: "Blaise Primary and Nursery", streets: ["Clavell Road"], bbox: [51.5005, -2.635, 51.5125, -2.615] },
  // Cottisford Road, Parkside Gardens and South Hayes (unbounded) plus Sir John's Lane, bounded up
  // to the Heyford Avenue junction the source names. OSM tags this street both with and without
  // the apostrophe, so both spellings are queried. Proposed, not yet built.
  { school: "Glenfrome Primary School", streets: ["Cottisford Road", "Parkside Gardens", "South Hayes", "Sir John's Lane", "Sir Johns Lane"], bbox: [51.4765, -2.566, 51.48, -2.56] },
  { school: "Our Lady of the Rosary RC Primary School", streets: ["Tide Grove"], bbox: [51.4927, -2.6715, 51.5047, -2.6515] },
  // Oakhill Drive, bounded to the Marksbury Road-Timsbury Road span the source names (permanent
  // closure at the school end, timed closure the rest of the way to Timsbury Road).
  { school: "Oasis Academy Marksbury Road", streets: ["Oakhill Drive"], bbox: [51.4325, -2.592, 51.435, -2.588] },
  { school: "May Park Primary School", streets: ["Coombe Road", "Freeland Buildings", "East Park"], bbox: [51.4656, -2.5675, 51.4776, -2.5475] },
];

function schoolStreetsQuery({ streets, bbox }) {
  const bboxStr = bbox.join(",");
  const clauses = streets.map((s) => `  way["name"="${s}"]["highway"](${bboxStr});`).join("\n");
  return `[out:json][timeout:30];\n(\n${clauses}\n);\nout geom;\n`;
}

// Existing rail network context layer: every currently-in-use railway=rail way
// (passenger or freight) across the wider Bristol area, for a background "where
// the tracks are" layer alongside the project corridor lines. Excludes
// railway=disused/abandoned/construction (those aren't "existing") and
// service=yard/siding/spur (sidings and depot throat trackage clutter the map
// without representing a route). Bbox is wider than the project-corridor
// queries above to catch the Bath, Weston-super-Mare/Nailsea, Gloucester/Filton
// Bank and Severn Beach lines fanning out from Temple Meads/Parkway, not just
// the city centre.
const railNetworkQuery = `
[out:json][timeout:90];
(
  way["railway"="rail"]["service"!~"yard|siding|spur"](51.32,-2.80,51.56,-2.40);
);
out geom;
`;

async function main() {
  const only = process.argv[2];
  const want = (section) => !only || only === section;

  if (want("portway")) {
    console.log("Fetching A4 Portway...");
    const portway = await overpassQuery(portwayQuery);
    writeFileSync(
      "public/data/a4_portway.geojson",
      JSON.stringify(waysToGeoJSON(portway.elements, { corridor: "A4 Portway" })),
    );
    console.log(`  ${portway.elements.length} elements written`);
    await sleep(6000);
  }

  if (want("bus2")) {
    console.log("Fetching Bus Route 2...");
    const bus2 = await overpassQuery(bus2Query);
    writeFileSync(
      "public/data/bus_route_2.geojson",
      JSON.stringify(waysToGeoJSON(bus2.elements, { corridor: "Bus Route 2" })),
    );
    console.log(`  ${bus2.elements.length} elements written`);
    await sleep(6000);
  }

  if (want("metrobus")) {
    const metrobusFeatures = [];
    for (const [ref, id] of Object.entries(metrobusRelations)) {
      console.log(`Fetching MetroBus ${ref}...`);
      const query = `[out:json][timeout:30];\nrelation(id:${id});\nout body;\n>;\nout geom qt;\n`;
      const data = await overpassQuery(query);
      const gj = waysToGeoJSON(data.elements, { corridor: `MetroBus ${ref}` });
      metrobusFeatures.push(...gj.features);
      console.log(`  ${gj.features.length} features`);
      await sleep(6000);
    }
    writeFileSync(
      "public/data/metrobus_network.geojson",
      JSON.stringify({ type: "FeatureCollection", features: metrobusFeatures }),
    );
    await sleep(6000);
  }

  if (want("portishead")) {
    console.log("Fetching Portishead Branch Line...");
    const portishead = await overpassQuery(portisheadLineQuery);
    writeFileSync(
      "public/data/portishead_line.geojson",
      JSON.stringify(waysToGeoJSON(portishead.elements, { corridor: "Portishead Branch Line" })),
    );
    console.log(`  ${portishead.elements.length} elements written`);
    await sleep(6000);
  }

  if (want("m1")) {
    console.log("Fetching m1 MetroBus extension corridor...");
    const m1 = await overpassQuery(m1ExtensionQuery);
    const extension = waysToGeoJSON(m1.elements, { corridor: "m1 MetroBus extension" });

    const hawkfield = extension.features.find((f) => f.properties.osm_id === 106895617);
    const jessop = extension.features.find((f) => f.properties.osm_id === 192976609);
    // Hawkfield Road's way starts at its north end; William Jessop Way's at its north-east end.
    trimAtNearestNode(hawkfield, BUTTERFLY_LANE_ON_HAWKFIELD, "start");
    trimAtNearestNode(jessop, BUTTERFLY_LANE_ON_JESSOP, "start");
    writeFileSync("public/data/m1_extension.geojson", JSON.stringify(extension));
    console.log(`  ${extension.features.length} features written`);

    // The cycle path is the same Hawkfield Road segment, as its own file.
    const cyclePath = {
      type: "FeatureCollection",
      features: [
        {
          ...hawkfield,
          properties: { ...hawkfield.properties, corridor: "Hawkfield Road cycle path" },
        },
      ],
    };
    writeFileSync("public/data/hawkfield_cycle_path.geojson", JSON.stringify(cyclePath));
    console.log(`  cycle path written (${hawkfield.geometry.coordinates.length} nodes)`);
    await sleep(6000);
  }

  if (want("henbury")) {
    console.log("Fetching Henbury Line...");
    const henbury = await overpassQuery(henburyLineQuery);
    writeFileSync(
      "public/data/henbury_line.geojson",
      JSON.stringify(waysToGeoJSON(henbury.elements, { corridor: "Henbury Line" })),
    );
    console.log(`  ${henbury.elements.length} elements written`);
    await sleep(6000);
  }

  if (want("temple-way")) {
    console.log("Fetching Temple Way...");
    const templeWay = await overpassQuery(templeWayQuery);
    writeFileSync(
      "public/data/temple_way.geojson",
      JSON.stringify(waysToGeoJSON(templeWay.elements, { corridor: "Temple Way" })),
    );
    console.log(`  ${templeWay.elements.length} elements written`);
    await sleep(6000);
  }

  if (want("bond-street")) {
    console.log("Fetching Bond Street corridor...");
    const bondStreet = await overpassQuery(bondStreetQuery);
    writeFileSync(
      "public/data/bond_street.geojson",
      JSON.stringify(waysToGeoJSON(bondStreet.elements, { corridor: "Bond Street" })),
    );
    console.log(`  ${bondStreet.elements.length} elements written`);
    await sleep(6000);

    console.log("Fetching Bond Street cycle route (Pembroke St / Portland Square / Wilson St)...");
    const bondCycle = await overpassQuery(bondStreetCycleQuery);
    const bondCycleGj = waysToGeoJSON(bondCycle.elements, { corridor: "Bond Street cycle route" });
    const portlandSquare = bondCycleGj.features.find((f) => f.properties.osm_id === 72343243);
    // The loop is a single closed way; keep only the south arc from Pembroke Street's end
    // round to Wilson Street's end, not the full square.
    trimAtNearestNode(portlandSquare, PORTLAND_SQUARE_WEST_CORNER, "start");
    writeFileSync("public/data/bond_street_cycle_route.geojson", JSON.stringify(bondCycleGj));
    console.log(`  ${bondCycleGj.features.length} features written`);
    await sleep(6000);
  }

  if (want("bedminster-bridges")) {
    console.log("Fetching Bedminster Bridges corridor...");
    const bedminster = await overpassQuery(bedminsterBridgesQuery);
    const bedminsterGj = waysToGeoJSON(bedminster.elements, { corridor: "Bedminster Bridges" });
    await sleep(6000);

    console.log("Fetching Bedminster Bridge Roundabout (the twin bridges themselves)...");
    const roundabout = await overpassQuery(bedminsterBridgeRoundaboutQuery);
    const roundaboutGj = waysToGeoJSON(roundabout.elements, { corridor: "Bedminster Bridges" });

    writeFileSync(
      "public/data/bedminster_bridges.geojson",
      JSON.stringify({
        type: "FeatureCollection",
        features: [...bedminsterGj.features, ...roundaboutGj.features],
      }),
    );
    console.log(`  ${bedminsterGj.features.length + roundaboutGj.features.length} features written`);
    await sleep(6000);
  }

  if (want("redcliffe-way")) {
    console.log("Fetching Redcliffe Way corridor...");
    const redcliffeWay = await overpassQuery(redcliffeWayQuery);
    const redcliffeWayGj = waysToGeoJSON(redcliffeWay.elements, { corridor: "Redcliffe Way" });
    writeFileSync("public/data/redcliffe_way.geojson", JSON.stringify(redcliffeWayGj));
    console.log(`  ${redcliffeWayGj.features.length} features written`);
    await sleep(6000);

    console.log("Fetching Redcliffe Way cycle track link (Redcliff Hill)...");
    // Redcliff Hill was already fetched as part of Bedminster Bridges; re-fetch it standalone
    // here so this section works even when run on its own.
    const redcliffHill = await overpassQuery(`
[out:json][timeout:30];
(
  way["name"="Redcliff Hill"]["highway"](51.440,-2.601,51.449,-2.589);
);
out geom;
`);
    const redcliffHillGj = waysToGeoJSON(redcliffHill.elements, {
      corridor: "Redcliffe Way cycle track",
    });
    const cycleTrack = {
      type: "FeatureCollection",
      features: [
        ...redcliffeWayGj.features.map((f) => ({
          ...f,
          properties: { ...f.properties, corridor: "Redcliffe Way cycle track" },
        })),
        ...redcliffHillGj.features,
      ],
    };
    writeFileSync("public/data/redcliffe_way_cycle_track.geojson", JSON.stringify(cycleTrack));
    console.log(`  ${cycleTrack.features.length} features written`);
    await sleep(6000);
  }

  if (want("broadmead")) {
    console.log("Fetching Broadmead corridor (Union St / The Horsefair / Penn St)...");
    const broadmead = await overpassQuery(broadmeadQuery);
    writeFileSync(
      "public/data/broadmead.geojson",
      JSON.stringify(waysToGeoJSON(broadmead.elements, { corridor: "Broadmead" })),
    );
    console.log(`  ${broadmead.elements.length} elements written`);
    await sleep(6000);
  }

  if (want("railway-path")) {
    console.log("Fetching Bristol & Bath Railway Path (Siston Common to Bitton Station)...");
    const railwayPath = await overpassQuery(railwayPathQuery);
    writeFileSync(
      "public/data/railway_path_barriers.geojson",
      JSON.stringify(
        waysToGeoJSON(railwayPath.elements, { corridor: "Bristol & Bath Railway Path" }),
      ),
    );
    console.log(`  ${railwayPath.elements.length} elements written`);
  }

  if (want("school-streets")) {
    // Resumable: schools already present in an existing output file are skipped, so a run that
    // dies partway (Overpass's shared public instances are occasionally all down at once) can
    // just be re-run rather than losing everything already fetched.
    const outPath = "public/data/bristol_school_streets.geojson";
    let schoolStreetFeatures = [];
    try {
      schoolStreetFeatures = JSON.parse(readFileSync(outPath, "utf8")).features;
    } catch {
      // no existing file
    }
    const done = new Set(schoolStreetFeatures.map((f) => f.properties.school));
    for (const group of schoolStreetGroups) {
      if (done.has(group.school)) {
        console.log(`Skipping ${group.school} (already fetched)`);
        continue;
      }
      console.log(`Fetching ${group.school} (${group.streets.join(", ")})...`);
      let data;
      for (let attempt = 1; ; attempt++) {
        try {
          data = await overpassQuery(schoolStreetsQuery(group));
          break;
        } catch (err) {
          if (attempt >= 3) throw err;
          console.warn(`  attempt ${attempt} failed (${err.message ?? err}), retrying in 15s...`);
          await sleep(15000);
        }
      }
      const gj = waysToGeoJSON(data.elements, { corridor: "Bristol School Streets", school: group.school });
      if (gj.features.length === 0) console.warn(`  WARNING: no ways found for ${group.school}`);
      schoolStreetFeatures.push(...gj.features);
      console.log(`  ${gj.features.length} features`);
      writeFileSync(outPath, JSON.stringify({ type: "FeatureCollection", features: schoolStreetFeatures }));
      await sleep(6000);
    }
    console.log(`  ${schoolStreetFeatures.length} total features written`);
  }

  if (want("rail-network")) {
    console.log("Fetching existing rail network...");
    const railNetwork = await overpassQuery(railNetworkQuery);
    writeFileSync(
      "public/data/rail_network.geojson",
      JSON.stringify(waysToGeoJSON(railNetwork.elements)),
    );
    console.log(`  ${railNetwork.elements.length} elements written`);
  }

  console.log("Done.");
}

main();
