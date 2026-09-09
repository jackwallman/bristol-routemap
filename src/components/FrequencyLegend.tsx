import { CONTOUR_MINUTES, MAX_MINUTES, RAMP, SURFACE_ALPHA_RANGE, WALK_WEIGHT } from "../lib/travelSurface";
import { buildRampLut, rampGradientStops } from "../lib/colorRamp";

const RAMP_LUT = buildRampLut(RAMP, MAX_MINUTES);
// Alpha matches the map's, not full opacity, so the legend reads the same weight as the surface.
const RAMP_GRADIENT = `linear-gradient(90deg, ${rampGradientStops(RAMP_LUT, 24, SURFACE_ALPHA_RANGE)
  .map((stop) => `${stop.color} ${stop.pct.toFixed(1)}%`)
  .join(", ")})`;

const SCALE_MINUTES = [0, ...CONTOUR_MINUTES, MAX_MINUTES];
// The ramp's axis is a weighted score, not a clock. Read as pure walking it's score/WALK_WEIGHT
// minutes on foot; read as pure transit (no walk at all) it's the score itself, unweighted. Each
// pair shares the position of the score it labels, so the two axes line up with the same ticks.
const WALKING_TICKS = SCALE_MINUTES.map((minutes) => Math.round(minutes / WALK_WEIGHT));
const TRANSIT_TICKS = SCALE_MINUTES;

function Axis({ values }: { values: number[] }) {
  return (
    <div className="frequency-axis">
      {values.map((value, i) => (
        <span
          key={SCALE_MINUTES[i]}
          style={{
            left: `${(SCALE_MINUTES[i] / MAX_MINUTES) * 100}%`,
            transform: i === 0 ? "none" : i === values.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
          }}
        >
          {i === values.length - 1 ? `${value}+` : value}
        </span>
      ))}
    </div>
  );
}

/** The "just missed it" colour key, drawn as a floating card over the map itself. */
export function FrequencyLegend() {
  return (
    <div className="map-legend">
      <div className="frequency-legend">
        <div className="frequency-key-row">
          <Axis values={WALKING_TICKS} />
          <span className="frequency-key-label">walking time</span>
        </div>
        <div className="frequency-ramp" style={{ backgroundImage: RAMP_GRADIENT }}>
          {CONTOUR_MINUTES.map((minutes) => (
            <span
              key={minutes}
              className="frequency-ramp-tick"
              style={{ left: `${(minutes / MAX_MINUTES) * 100}%` }}
            />
          ))}
        </div>
        <div className="frequency-key-row">
          <Axis values={TRANSIT_TICKS} />
          <span className="frequency-key-label">transit/waiting time</span>
        </div>
        <p className="frequency-ramp-note">Map colors: combined walking, transit, and waiting time.</p>
      </div>
    </div>
  );
}
