// Fetches real road/bus-route geometry from OpenStreetMap via the Overpass API
// (free, no key) for corridor projects that don't have geometry published on
// Open Data Bristol. Run with: node scripts/fetch-osm-routes.mjs
// Pass a section name to refresh just one output without re-fetching the rest:
// node scripts/fetch-osm-routes.mjs m1   (sections: portway, bus2, metrobus, portishead, m1, henbury)
//
// Data is © OpenStreetMap contributors, ODbL — see https://www.openstreetmap.org/copyright
// Overpass is a shared public resource: this script fetches one relation at a
// time with a delay between requests. Don't parallelize it.

import { writeFileSync } from "node:fs";

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
  }

  console.log("Done.");
}

main();
