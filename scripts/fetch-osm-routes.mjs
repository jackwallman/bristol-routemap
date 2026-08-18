// Fetches real road/bus-route geometry from OpenStreetMap via the Overpass API
// (free, no key) for corridor projects that don't have geometry published on
// Open Data Bristol. Run with: node scripts/fetch-osm-routes.mjs
//
// Data is © OpenStreetMap contributors, ODbL — see https://www.openstreetmap.org/copyright
// Overpass is a shared public resource: this script fetches one relation at a
// time with a delay between requests. Don't parallelize it.

import { writeFileSync } from "node:fs";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpassQuery(query) {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  return res.json();
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
  console.log("Fetching A4 Portway...");
  const portway = await overpassQuery(portwayQuery);
  writeFileSync(
    "public/data/a4_portway.geojson",
    JSON.stringify(waysToGeoJSON(portway.elements, { corridor: "A4 Portway" })),
  );
  console.log(`  ${portway.elements.length} elements written`);
  await sleep(6000);

  console.log("Fetching Bus Route 2...");
  const bus2 = await overpassQuery(bus2Query);
  writeFileSync(
    "public/data/bus_route_2.geojson",
    JSON.stringify(waysToGeoJSON(bus2.elements, { corridor: "Bus Route 2" })),
  );
  console.log(`  ${bus2.elements.length} elements written`);
  await sleep(6000);

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

  console.log("Fetching Portishead Branch Line...");
  const portishead = await overpassQuery(portisheadLineQuery);
  writeFileSync(
    "public/data/portishead_line.geojson",
    JSON.stringify(waysToGeoJSON(portishead.elements, { corridor: "Portishead Branch Line" })),
  );
  console.log(`  ${portishead.elements.length} elements written`);
  await sleep(6000);

  console.log("Fetching Henbury Line...");
  const henbury = await overpassQuery(henburyLineQuery);
  writeFileSync(
    "public/data/henbury_line.geojson",
    JSON.stringify(waysToGeoJSON(henbury.elements, { corridor: "Henbury Line" })),
  );
  console.log(`  ${henbury.elements.length} elements written`);

  console.log("Done.");
}

main();
