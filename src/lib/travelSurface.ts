import { stationsById } from "../data/rail-service";
import { buildRampLut, type RampStop } from "./colorRamp";

export const WALK_KMH = 4.8;
// Straight-line distance underestimates real street distance; this scales it back up.
export const DETOUR_FACTOR = 1.3;
export const MAX_MINUTES = 90;

// Walking is more onerous than sitting on a train, and the standard planning range for perceived
// walk time is 1.5-2x in-vehicle. At this weight a 30-minute walk scores 67.5 - deep red - which
// is the point: a place you can only reach on foot is not "half an hour away", it's a slog. There
// is no separate walk cap: a station's own catchment simply runs out where the ramp does, at
// MAX_MINUTES, so slow stations shrink to almost nothing and fast ones bloom.
export const WALK_WEIGHT = 2.25;

// Grass -> ember. Bright grassy green while a trip is genuinely quick, then gold, orange, red and
// down to a near-black oxblood: slow places get darker and heavier until they smother the
// basemap. Deliberately not colourblind- or greyscale-safe (the gold sits at roughly the same
// lightness as the green) — the map is optimised for how forcefully "long times bad" reads, not
// for an ordering that survives desaturation.
export const RAMP: RampStop[] = [
  { minutes: 0, color: "#f5fce6" },
  { minutes: 9, color: "#b9e06b" },
  { minutes: 20, color: "#8ecb45" },
  { minutes: 30, color: "#dfb838" },
  { minutes: 42, color: "#e88a33" },
  { minutes: 53, color: "#dc5a2b" },
  { minutes: 65, color: "#bf2f26" },
  { minutes: 76, color: "#8c1618" },
  { minutes: 85, color: "#55090e" },
  { minutes: 90, color: "#2a0407" },
];

const RAMP_LUT = buildRampLut(RAMP, MAX_MINUTES);
const RAMP_LUT_SIZE = RAMP_LUT.length / 3;

// Reference points on the weighted scale, same units as MAX_MINUTES — used only for the legend's
// axis ticks, not drawn on the surface itself (an isolated catchment is radially symmetric, so
// drawn threshold lines read as a bullseye rather than a useful marker).
export const TICK_MINUTES = [15, 30, 45, 60, 75];

// Alpha rises with travel time — near areas are airy enough to show the basemap through, far
// areas get heavy enough to smother it — reinforcing "long = bad" through weight, not just hue.
// Exported so the legend gradient can match the same weight rather than showing every band at
// full opacity.
export const SURFACE_ALPHA_RANGE: [number, number] = [0.55, 0.85];
const [ALPHA_NEAR, ALPHA_FAR] = SURFACE_ALPHA_RANGE;

const KM_PER_DEGREE_LAT = 111.32;

function walkMinutes(from: [number, number], to: [number, number]): number {
  const lat = (from[1] + to[1]) / 2;
  const dx = (to[0] - from[0]) * Math.cos((lat * Math.PI) / 180) * KM_PER_DEGREE_LAT;
  const dy = (to[1] - from[1]) * KM_PER_DEGREE_LAT;
  const km = Math.sqrt(dx * dx + dy * dy) * DETOUR_FACTOR;
  return (km / WALK_KMH) * 60;
}

// How far (in walking minutes, then straight-line km) a station's own catchment reaches before
// the weighted score would exceed MAX_MINUTES — the fast the train got you there, the further you
// can still walk and stay on the ramp.
function reachMinutes(arrival: number): number {
  return Math.max(0, (MAX_MINUTES - arrival) / WALK_WEIGHT);
}

function reachKm(arrival: number): number {
  return (reachMinutes(arrival) / 60) * WALK_KMH / DETOUR_FACTOR;
}

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const invMercY = (y: number) => (Math.atan(Math.sinh(y)) * 180) / Math.PI;

export interface LngLatBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * Bounding box of every reachable station, padded by the single largest catchment radius among
 * them — big enough that the surface never clips a station's own walk-shed, small enough to skip
 * drawing distant empty ocean. Bristol has no fixed bbox here on purpose: the reachable set (and
 * hence the useful extent) is completely different from Clifton Down than from Severn Beach.
 */
function computeBounds(arrivals: Map<string, number>): LngLatBounds {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  let maxReachKm = 0;
  arrivals.forEach((arrival, stationId) => {
    const station = stationsById[stationId];
    if (!station) return;
    west = Math.min(west, station.coordinates[0]);
    south = Math.min(south, station.coordinates[1]);
    east = Math.max(east, station.coordinates[0]);
    north = Math.max(north, station.coordinates[1]);
    maxReachKm = Math.max(maxReachKm, reachKm(arrival));
  });

  const midLat = (south + north) / 2 || 51.4545;
  const padLon = maxReachKm / (Math.cos((midLat * Math.PI) / 180) * KM_PER_DEGREE_LAT);
  const padLat = maxReachKm / KM_PER_DEGREE_LAT;

  return {
    west: west - padLon,
    south: south - padLat,
    east: east + padLon,
    north: north + padLat,
  };
}

// The rendered surface must cover at least the visible map, or panning past the stations'
// own padded bounds would hit bare basemap even though every pixel there is still (further
// than) off the scale. Widening to the envelope of both keeps every station's full catchment
// AND whatever's currently on screen.
function unionBounds(a: LngLatBounds, b: LngLatBounds): LngLatBounds {
  return {
    west: Math.min(a.west, b.west),
    south: Math.min(a.south, b.south),
    east: Math.max(a.east, b.east),
    north: Math.max(a.north, b.north),
  };
}

// Target ground resolution, independently clamped per axis. A fixed grid size either wastes
// resolution on a small extent (Clifton Down) or gets blocky on a large one (Severn Beach) — this
// keeps pixels roughly the same size on the ground across both, while the clamp keeps the array
// bounded on a very large or very small extent.
const METERS_PER_PIXEL = 20;
const MIN_GRID = 1024;
const MAX_GRID = 2048;

function gridDimensions(bounds: LngLatBounds): { width: number; height: number } {
  const midLat = (bounds.south + bounds.north) / 2;
  const widthKm = (bounds.east - bounds.west) * Math.cos((midLat * Math.PI) / 180) * KM_PER_DEGREE_LAT;
  const heightKm = (bounds.north - bounds.south) * KM_PER_DEGREE_LAT;
  const clamp = (px: number) => Math.round(Math.min(MAX_GRID, Math.max(MIN_GRID, px)));
  return {
    width: clamp((widthKm * 1000) / METERS_PER_PIXEL),
    height: clamp((heightKm * 1000) / METERS_PER_PIXEL),
  };
}

export interface SurfaceSample {
  /** The weighted value the colour encodes, 0-90. */
  score: number;
  /** The real clock-time journey: arrival + unweighted walk. */
  minutes: number;
  /** Of `minutes`, how much is walking. */
  walkMinutes: number;
}

export interface TravelSurface {
  bounds: LngLatBounds;
  image: ImageData;
  /** The journey at this point having just missed a train, or null if it's outside the surface. */
  sampleAt(lng: number, lat: number): SurfaceSample | null;
}

/**
 * Builds the "just missed it" travel-time surface as an `ImageData`, for use as a MapLibre image
 * source. Every pixel takes the minimum, over all reachable stations, of that station's rail
 * arrival time plus a walk from there weighted by WALK_WEIGHT — so walking straight from the
 * origin (arrival 0) is automatically part of the minimum wherever it beats waiting for a train.
 * There's no separate walk cap: a station's catchment simply runs out where the weighted score
 * would exceed MAX_MINUTES, so a fast station's shed reaches further than a slow one's.
 *
 * Rendered by scattering from each station into its own capped pixel window rather than scanning
 * every pixel against every station — with a station-specific reach the window is small, so this
 * is orders of magnitude cheaper than the full pixel x station scan an unbounded field would need.
 *
 * `viewBounds`, when given, is unioned into the render extent so the surface always covers the
 * current map view (see `unionBounds`) — every pixel that ends up outside every catchment is then
 * filled solid in the ramp's own darkest red rather than left bare, so there's no edge where the
 * surface just stops; it reads as "off the scale", not "unmeasured".
 */
export function renderSurface(arrivals: Map<string, number>, viewBounds?: LngLatBounds): TravelSurface {
  const bounds = viewBounds ? unionBounds(computeBounds(arrivals), viewBounds) : computeBounds(arrivals);
  const { width, height } = gridDimensions(bounds);
  const stationList = Array.from(arrivals.entries())
    .map(([id, arrival]) => ({ coordinates: stationsById[id]?.coordinates, arrival }))
    .filter(
      (s): s is { coordinates: [number, number]; arrival: number } =>
        s.coordinates != null && s.arrival <= MAX_MINUTES,
    );

  const northY = mercY(bounds.north);
  const southY = mercY(bounds.south);
  const rowToLat = (row: number) => invMercY(northY - ((row + 0.5) / height) * (northY - southY));
  const colToLon = (col: number) => bounds.west + ((col + 0.5) / width) * (bounds.east - bounds.west);
  const latToRow = (lat: number) => ((northY - mercY(lat)) / (northY - southY)) * height;
  const lonToCol = (lon: number) => ((lon - bounds.west) / (bounds.east - bounds.west)) * width;

  const best = new Float32Array(width * height).fill(Infinity);
  // The real walk minutes belonging to whichever station won each pixel — used to recover the
  // real journey (arrival + walk) from the weighted score for the hover readout.
  const bestWalk = new Float32Array(width * height);

  for (const station of stationList) {
    const reachMin = reachMinutes(station.arrival);
    if (reachMin <= 0) continue;
    const stationReachKm = reachKm(station.arrival);
    const [slon, slat] = station.coordinates;
    const padLon = stationReachKm / (Math.cos((slat * Math.PI) / 180) * KM_PER_DEGREE_LAT);
    const padLat = stationReachKm / KM_PER_DEGREE_LAT;

    const rowStart = Math.max(0, Math.floor(latToRow(slat + padLat)));
    const rowEnd = Math.min(height - 1, Math.ceil(latToRow(slat - padLat)));
    const colStart = Math.max(0, Math.floor(lonToCol(slon - padLon)));
    const colEnd = Math.min(width - 1, Math.ceil(lonToCol(slon + padLon)));

    for (let row = rowStart; row <= rowEnd; row++) {
      const lat = rowToLat(row);
      for (let col = colStart; col <= colEnd; col++) {
        const lon = colToLon(col);
        const walk = walkMinutes(station.coordinates, [lon, lat]);
        if (walk > reachMin) continue;
        const idx = row * width + col;
        const total = station.arrival + WALK_WEIGHT * walk;
        if (total < best[idx]) {
          best[idx] = total;
          bestWalk[idx] = walk;
        }
      }
    }
  }

  const image = new ImageData(width, height);
  const data = image.data;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = row * width + col;
      const score = best[idx];
      const pixel = idx * 4;
      if (!Number.isFinite(score)) {
        // Outside every station's own catchment — further than the worst thing the ramp
        // measures, not "no data". Solid in the ramp's own darkest red (RAMP's design intent is
        // for slow places to "smother the basemap"; this is that carried to its limit) rather
        // than a hole of transparent basemap wherever the surface extends past the last catchment.
        const lastStop = (RAMP_LUT_SIZE - 1) * 3;
        data[pixel] = RAMP_LUT[lastStop];
        data[pixel + 1] = RAMP_LUT[lastStop + 1];
        data[pixel + 2] = RAMP_LUT[lastStop + 2];
        data[pixel + 3] = Math.round(ALPHA_FAR * 255);
        continue;
      }

      const lutIndex = Math.round(Math.min(1, Math.max(0, score / MAX_MINUTES)) * (RAMP_LUT_SIZE - 1)) * 3;
      let r = RAMP_LUT[lutIndex];
      let g = RAMP_LUT[lutIndex + 1];
      let b = RAMP_LUT[lutIndex + 2];

      // No edge fade: a catchment's own outer edge now hands off directly to the off-scale fill
      // above (same darkest colour, same ALPHA_FAR), so alpha just rises to that value rather
      // than dipping back toward transparent right where it would otherwise meet solid colour.
      const alpha = ALPHA_NEAR + (ALPHA_FAR - ALPHA_NEAR) * Math.min(1, score / MAX_MINUTES);

      data[pixel] = r;
      data[pixel + 1] = g;
      data[pixel + 2] = b;
      data[pixel + 3] = Math.round(alpha * 255);
    }
  }

  function sampleAt(lng: number, lat: number): SurfaceSample | null {
    const col = Math.floor(lonToCol(lng));
    const row = Math.floor(latToRow(lat));
    if (col < 0 || col >= width || row < 0 || row >= height) return null;
    const idx = row * width + col;
    const score = best[idx];
    if (!Number.isFinite(score) || score > MAX_MINUTES) return null;
    const walkMinutes = bestWalk[idx];
    // score = arrival + WALK_WEIGHT * walk, and minutes = arrival + walk, so minutes = score -
    // (WALK_WEIGHT - 1) * walk — recovered without a third array.
    const minutes = score - (WALK_WEIGHT - 1) * walkMinutes;
    return { score, minutes, walkMinutes };
  }

  return { bounds, image, sampleAt };
}
