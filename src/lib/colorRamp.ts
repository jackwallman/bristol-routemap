// OKLab-interpolated colour ramps. Piecewise-linear in OKLab (not sRGB) so a ramp with widely
// spaced hue stops — green to near-black red, here — doesn't pass through a muddy, desaturated
// midpoint the way naive RGB lerp does.

export interface RampStop {
  minutes: number;
  color: string;
}

function srgbChannelToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearChannelToSrgb(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
}

function hexToOklab(hex: string): [number, number, number] {
  const r = srgbChannelToLinear(parseInt(hex.slice(1, 3), 16));
  const g = srgbChannelToLinear(parseInt(hex.slice(3, 5), 16));
  const b = srgbChannelToLinear(parseInt(hex.slice(5, 7), 16));

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);

  return [
    linearChannelToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearChannelToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearChannelToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/**
 * A 256-entry RGB lookup table, indexed by `Math.round((minutes / maxMinutes) * 255)`, built by
 * interpolating `stops` in OKLab. `stops` must be sorted by `minutes` and span `[0, maxMinutes]`.
 */
export function buildRampLut(stops: RampStop[], maxMinutes: number, size = 256): Uint8ClampedArray {
  const labs = stops.map((stop) => ({ minutes: stop.minutes, lab: hexToOklab(stop.color) }));
  const lut = new Uint8ClampedArray(size * 3);

  for (let i = 0; i < size; i++) {
    const minutes = (i / (size - 1)) * maxMinutes;
    let k = 0;
    while (k < labs.length - 2 && minutes > labs[k + 1].minutes) k++;
    const lo = labs[k];
    const hi = labs[k + 1];
    const t = hi.minutes === lo.minutes ? 0 : Math.min(1, Math.max(0, (minutes - lo.minutes) / (hi.minutes - lo.minutes)));

    const L = lo.lab[0] + (hi.lab[0] - lo.lab[0]) * t;
    const A = lo.lab[1] + (hi.lab[1] - lo.lab[1]) * t;
    const B = lo.lab[2] + (hi.lab[2] - lo.lab[2]) * t;
    const [r, g, b] = oklabToRgb(L, A, B);

    lut[i * 3] = r;
    lut[i * 3 + 1] = g;
    lut[i * 3 + 2] = b;
  }

  return lut;
}

/**
 * Evenly-spaced CSS colour stops sampled from `lut`, for a `linear-gradient` that matches it
 * exactly. When `alphaRange` is given, each stop's alpha is lerped across it (matching the
 * near/far alpha used on the map) so the legend reads the same weight as the surface, rather than
 * showing every band at full opacity regardless of how heavily it's actually drawn.
 */
export function rampGradientStops(
  lut: Uint8ClampedArray,
  count = 24,
  alphaRange?: [number, number],
): { pct: number; color: string }[] {
  const size = lut.length / 3;
  const stops: { pct: number; color: string }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const pct = t * 100;
    const idx = Math.round(t * (size - 1));
    const r = lut[idx * 3];
    const g = lut[idx * 3 + 1];
    const b = lut[idx * 3 + 2];
    const color = alphaRange
      ? `rgba(${r}, ${g}, ${b}, ${(alphaRange[0] + (alphaRange[1] - alphaRange[0]) * t).toFixed(2)})`
      : `rgb(${r}, ${g}, ${b})`;
    stops.push({ pct, color });
  }
  return stops;
}
