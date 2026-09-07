import { stationsById } from "../data/rail-service";

export const WALK_KMH = 4.8;
// Straight-line distance underestimates real street distance; this scales it back up.
export const DETOUR_FACTOR = 1.3;
export const MAX_MINUTES = 90;

export const WALK_CAP_OPTIONS = [10, 15, 20];
export const DEFAULT_WALK_CAP = 15;

export interface Band {
  maxMinutes: number;
  color: string;
  label: string;
}

// Green -> amber -> red, darkening as it goes (lightness ~89 -> 82 -> 65 -> 45 -> 29) so the
// quick/slow ordering still reads under deuteranopia or in greyscale, unlike a flat traffic-light
// ramp of equally-light hues.
export const BANDS: Band[] = [
  { maxMinutes: 15, color: "#d3ebb4", label: "Within 15 min" },
  { maxMinutes: 30, color: "#f0c74a", label: "Within 30 min" },
  { maxMinutes: 45, color: "#e08637", label: "Within 45 min" },
  { maxMinutes: 60, color: "#c9412f", label: "Within 60 min" },
  { maxMinutes: 90, color: "#85152a", label: "Within 90 min" },
];

const BAND_RGB: { maxMinutes: number; rgb: [number, number, number] }[] = BANDS.map((band) => ({
  maxMinutes: band.maxMinutes,
  rgb: [
    parseInt(band.color.slice(1, 3), 16),
    parseInt(band.color.slice(3, 5), 16),
    parseInt(band.color.slice(5, 7), 16),
  ],
}));

const KM_PER_DEGREE_LAT = 111.32;

function walkMinutes(from: [number, number], to: [number, number]): number {
  const lat = (from[1] + to[1]) / 2;
  const dx = (to[0] - from[0]) * Math.cos((lat * Math.PI) / 180) * KM_PER_DEGREE_LAT;
  const dy = (to[1] - from[1]) * KM_PER_DEGREE_LAT;
  const km = Math.sqrt(dx * dx + dy * dy) * DETOUR_FACTOR;
  return (km / WALK_KMH) * 60;
}

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const invMercY = (y: number) => (Math.atan(Math.sinh(y)) * 180) / Math.PI;

export interface LngLatBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

function bandRgbFor(minutes: number): [number, number, number] | null {
  for (const band of BAND_RGB) {
    if (minutes <= band.maxMinutes) return band.rgb;
  }
  return null;
}

/**
 * Bounding box of every reachable station, padded by one capped walk beyond the outermost
 * station — big enough that the surface never clips a station's own walk-shed, small enough to
 * skip drawing distant empty ocean. Bristol has no fixed bbox here on purpose: the reachable set
 * (and hence the useful extent) is completely different from Clifton Down than from Severn Beach.
 */
function computeBounds(arrivals: Map<string, number>, capKm: number): LngLatBounds {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  arrivals.forEach((_arrival, stationId) => {
    const station = stationsById[stationId];
    if (!station) return;
    west = Math.min(west, station.coordinates[0]);
    south = Math.min(south, station.coordinates[1]);
    east = Math.max(east, station.coordinates[0]);
    north = Math.max(north, station.coordinates[1]);
  });

  const midLat = (south + north) / 2 || 51.4545;
  const padLon = capKm / (Math.cos((midLat * Math.PI) / 180) * KM_PER_DEGREE_LAT);
  const padLat = capKm / KM_PER_DEGREE_LAT;

  return {
    west: west - padLon,
    south: south - padLat,
    east: east + padLon,
    north: north + padLat,
  };
}

const GRID_SIZE = 1024;

/**
 * Paints the "just missed it" travel-time surface into `canvas` and returns the lng/lat bounds it
 * covers, for use as a MapLibre canvas/image source's corner coordinates. Every pixel takes the
 * minimum, over all reachable stations, of that station's rail arrival time plus a plain walk from
 * there at WALK_KMH, capped at `walkCapMinutes` — so walking straight from the origin (arrival 0)
 * is automatically part of the minimum wherever it beats waiting for a train, but the surface is
 * the union of capped station catchments rather than an unbounded field: people don't walk 5km to
 * or from a train, so a pixel beyond every station's walk cap is drawn as unreachable even if it
 * is technically within MAX_MINUTES of a very frequent station.
 *
 * Rendered by scattering from each station into its own capped pixel window rather than scanning
 * every pixel against every station — with a ~1km cap the window is tiny, so this is orders of
 * magnitude cheaper than the full pixel x station scan a global walk radius would need.
 */
export function renderSurface(
  canvas: HTMLCanvasElement,
  arrivals: Map<string, number>,
  walkCapMinutes: number,
): LngLatBounds {
  const capKm = (walkCapMinutes / 60) * WALK_KMH / DETOUR_FACTOR;
  const bounds = computeBounds(arrivals, capKm);
  const stationList = Array.from(arrivals.entries())
    .map(([id, arrival]) => ({ coordinates: stationsById[id]?.coordinates, arrival }))
    .filter(
      (s): s is { coordinates: [number, number]; arrival: number } =>
        s.coordinates != null && s.arrival <= MAX_MINUTES,
    );

  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(GRID_SIZE, GRID_SIZE);

  const northY = mercY(bounds.north);
  const southY = mercY(bounds.south);
  const rowToLat = (row: number) => invMercY(northY - ((row + 0.5) / GRID_SIZE) * (northY - southY));
  const colToLon = (col: number) => bounds.west + ((col + 0.5) / GRID_SIZE) * (bounds.east - bounds.west);
  const latToRow = (lat: number) => ((northY - mercY(lat)) / (northY - southY)) * GRID_SIZE;
  const lonToCol = (lon: number) => ((lon - bounds.west) / (bounds.east - bounds.west)) * GRID_SIZE;

  const best = new Float32Array(GRID_SIZE * GRID_SIZE).fill(Infinity);

  for (const station of stationList) {
    const [slon, slat] = station.coordinates;
    const padLon = capKm / (Math.cos((slat * Math.PI) / 180) * KM_PER_DEGREE_LAT);
    const padLat = capKm / KM_PER_DEGREE_LAT;

    const rowStart = Math.max(0, Math.floor(latToRow(slat + padLat)));
    const rowEnd = Math.min(GRID_SIZE - 1, Math.ceil(latToRow(slat - padLat)));
    const colStart = Math.max(0, Math.floor(lonToCol(slon - padLon)));
    const colEnd = Math.min(GRID_SIZE - 1, Math.ceil(lonToCol(slon + padLon)));

    for (let row = rowStart; row <= rowEnd; row++) {
      const lat = rowToLat(row);
      for (let col = colStart; col <= colEnd; col++) {
        const lon = colToLon(col);
        const walk = walkMinutes(station.coordinates, [lon, lat]);
        if (walk > walkCapMinutes) continue;
        const total = station.arrival + walk;
        const idx = row * GRID_SIZE + col;
        if (total < best[idx]) best[idx] = total;
      }
    }
  }

  for (let i = 0; i < best.length; i++) {
    const rgb = bandRgbFor(best[i]);
    const idx = i * 4;
    if (rgb) {
      image.data[idx] = rgb[0];
      image.data[idx + 1] = rgb[1];
      image.data[idx + 2] = rgb[2];
      image.data[idx + 3] = 255;
    } else {
      image.data[idx + 3] = 0;
    }
  }

  ctx.putImageData(image, 0, 0);
  return bounds;
}
