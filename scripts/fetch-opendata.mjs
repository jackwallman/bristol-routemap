// Re-fetches the Open Data Bristol GIS layers used for map context into public/data/.
// Run with: node scripts/fetch-opendata.mjs
// Source: ArcGIS Hub DCAT feed at https://opendata.bristol.gov.uk/api/feed/dcat-us/1.1.json

import { writeFileSync } from "node:fs";

const LAYERS = [
  {
    name: "cycle_network",
    url: "https://opendata.bristol.gov.uk/api/download/v1/items/27d0962975c94b2fab85403df622ec9f/geojson?layers=25",
  },
  {
    name: "bus_stops",
    url: "https://opendata.bristol.gov.uk/api/download/v1/items/1d03b8edb6474ebfa333e0181992f075/geojson?layers=4",
    trim: true,
  },
  {
    name: "eastbristol_ln_boundary",
    url: "https://opendata.bristol.gov.uk/api/download/v1/items/c81916ee68e04c2994e4f0b9a406096a/geojson?layers=0",
  },
];

for (const layer of LAYERS) {
  const res = await fetch(layer.url, { redirect: "follow" });
  if (!res.ok) {
    console.error(`${layer.name}: HTTP ${res.status}`);
    continue;
  }
  let geojson = await res.json();
  if (layer.trim) {
    geojson.features = geojson.features.map((f) => ({
      type: f.type,
      geometry: f.geometry,
      properties: { name: f.properties.CommonName ?? f.properties.NaptanCode ?? null },
    }));
  }
  writeFileSync(`public/data/${layer.name}.geojson`, JSON.stringify(geojson));
  console.log(`${layer.name}: ${geojson.features.length} features written`);
}
