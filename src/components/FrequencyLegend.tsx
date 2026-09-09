import { CONTOUR_MINUTES, MAX_MINUTES, RAMP, SURFACE_ALPHA_RANGE, WALK_WEIGHT } from "../lib/travelSurface";
import { buildRampLut, rampGradientStops } from "../lib/colorRamp";

const RAMP_LUT = buildRampLut(RAMP, MAX_MINUTES);
// Alpha matches the map's, not full opacity, so the legend reads the same weight as the surface.
const RAMP_GRADIENT = `linear-gradient(90deg, ${rampGradientStops(RAMP_LUT, 24, SURFACE_ALPHA_RANGE)
  .map((stop) => `${stop.color} ${stop.pct.toFixed(1)}%`)
  .join(", ")})`;

/** The "just missed it" colour key, drawn as a floating card over the map itself. */
export function FrequencyLegend() {
  return (
    <div className="map-legend">
      <div className="frequency-legend">
        <div className="frequency-ramp" style={{ backgroundImage: RAMP_GRADIENT }}>
          {CONTOUR_MINUTES.map((minutes) => (
            <span
              key={minutes}
              className="frequency-ramp-tick"
              style={{ left: `${(minutes / MAX_MINUTES) * 100}%` }}
            />
          ))}
        </div>
        <div className="frequency-ramp-labels">
          {[0, ...CONTOUR_MINUTES, MAX_MINUTES].map((minutes) => (
            <span
              key={minutes}
              style={{
                left: `${(minutes / MAX_MINUTES) * 100}%`,
                transform: minutes === 0 ? "none" : minutes === MAX_MINUTES ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {minutes === MAX_MINUTES ? `${minutes}+` : minutes}
            </span>
          ))}
        </div>
        <p className="frequency-ramp-note">
          Walking counts {WALK_WEIGHT}× a minute on the train — 30 minutes on foot alone scores
          {" "}{Math.round(30 * WALK_WEIGHT)}, on the same scale as the train ride above. The
          darkest red also covers everywhere further than that — there's no separate colour
          past it.
        </p>
      </div>
    </div>
  );
}
