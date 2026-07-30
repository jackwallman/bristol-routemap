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

  console.log("Done.");
}

main();
