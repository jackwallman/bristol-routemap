import { lines, stations, stationsById } from "../data/rail-service";
import type { DayType, Daypart } from "../types/rail";
import { dayTypeGroups, daypartBands } from "../lib/serviceBands";
import { CONTOUR_MINUTES, MAX_MINUTES, RAMP, SURFACE_ALPHA_RANGE, WALK_WEIGHT } from "../lib/travelSurface";
import { buildRampLut, rampGradientStops } from "../lib/colorRamp";

const RAMP_LUT = buildRampLut(RAMP, MAX_MINUTES);
// Alpha matches the map's, not full opacity, so the legend reads the same weight as the surface.
const RAMP_GRADIENT = `linear-gradient(90deg, ${rampGradientStops(RAMP_LUT, 24, SURFACE_ALPHA_RANGE)
  .map((stop) => `${stop.color} ${stop.pct.toFixed(1)}%`)
  .join(", ")})`;

const OVERRIDE_OPTIONS = [10, 15, 20, 30];

interface FrequencyPanelProps {
  originId: string | null;
  onSelectOrigin: (id: string) => void;
  dayType: DayType;
  onDayType: (dayType: DayType) => void;
  daypart: Daypart;
  onDaypart: (daypart: Daypart) => void;
  headwayOverride: number | null;
  onHeadwayOverride: (minutes: number | null) => void;
  includePlanned: boolean;
  onToggleIncludePlanned: () => void;
  arrivals: Map<string, number> | null;
}

export function FrequencyPanel({
  originId,
  onSelectOrigin,
  dayType,
  onDayType,
  daypart,
  onDaypart,
  headwayOverride,
  onHeadwayOverride,
  includePlanned,
  onToggleIncludePlanned,
  arrivals,
}: FrequencyPanelProps) {
  const visibleStations = stations
    .filter((s) => s.crs || includePlanned)
    .sort((a, b) => a.name.localeCompare(b.name));

  const linesInPlay = lines.filter((l) => includePlanned || l.serviceStatus !== "planned");

  // Day and time options are derived from the timetable data rather than listed, so a pill
  // only appears where the frequency actually changes — see lib/serviceBands.ts.
  const dayGroups = dayTypeGroups(linesInPlay);
  const activeDayGroup = dayGroups.find((g) => g.dayTypes.includes(dayType)) ?? dayGroups[0];
  const bands = daypartBands(linesInPlay, activeDayGroup.dayTypes[0]);
  const activeBand = bands.find((b) => b.dayparts.includes(daypart)) ?? bands[0];

  const originLines = originId
    ? linesInPlay.filter((l) => l.stations.includes(originId))
    : [];
  const daypartHasService = (dp: Daypart) => originLines.some((l) => l.headways[dayType][dp] !== null);

  const destinations = arrivals
    ? Array.from(arrivals.entries())
        .filter(([id]) => id !== originId)
        .map(([id, minutes]) => ({ station: stationsById[id], minutes }))
        .filter((d) => d.station)
        .sort((a, b) => a.minutes - b.minutes)
    : [];

  return (
    <div className="frequency-panel">
      <p className="frequency-intro">
        Pick a station and imagine you just missed your train by 30 seconds. This shows how long
        it then takes to reach everywhere else — riding one train, optionally changing once, then
        walking the rest of the way at a normal pace. Walking counts for more than riding —
        {" "}{WALK_WEIGHT}× a minute on the train — since a place you can only reach on foot isn't
        genuinely "10 minutes away" the way a train stop is. On an infrequent line, the wait can
        matter more than the ride.
      </p>

      <section className="filter-section">
        <h2>Origin station</h2>
        <select
          className="frequency-select"
          value={originId ?? ""}
          onChange={(e) => onSelectOrigin(e.target.value)}
        >
          <option value="" disabled>
            Choose a station…
          </option>
          {visibleStations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {!s.crs ? " (planned)" : ""}
            </option>
          ))}
        </select>
      </section>

      <section className="filter-section">
        <h2>Day</h2>
        <div className="status-pills">
          {dayGroups.map((group) => {
            const active = group === activeDayGroup;
            return (
              <button
                key={group.label}
                type="button"
                className={"status-pill" + (active ? "" : " status-pill--inactive")}
                style={active ? { backgroundColor: "#2a78d6" } : undefined}
                onClick={() => onDayType(group.dayTypes[0])}
                aria-pressed={active}
              >
                {group.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="filter-section">
        <h2>Time of day</h2>
        <div className="status-pills">
          {bands.map((band) => {
            const active = band === activeBand;
            const hasService = daypartHasService(band.dayparts[0]);
            return (
              <button
                key={band.label}
                type="button"
                className={"status-pill" + (active ? "" : " status-pill--inactive")}
                style={active ? { backgroundColor: "#2a78d6" } : undefined}
                onClick={() => onDaypart(band.dayparts[0])}
                aria-pressed={active}
                disabled={!hasService}
                title={hasService ? undefined : "No service from this station in this band"}
              >
                {band.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="filter-section">
        <h2>What if it were frequent?</h2>
        <label className="filter-row">
          <input
            type="checkbox"
            checked={headwayOverride !== null}
            onChange={() => onHeadwayOverride(headwayOverride !== null ? null : 15)}
          />
          Override every running line's headway
        </label>
        {headwayOverride !== null && (
          <div className="headway-options">
            {OVERRIDE_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={"status-pill" + (headwayOverride === minutes ? "" : " status-pill--inactive")}
                style={headwayOverride === minutes ? { backgroundColor: "#2a78d6" } : undefined}
                onClick={() => onHeadwayOverride(minutes)}
                aria-pressed={headwayOverride === minutes}
              >
                Every {minutes} min
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="filter-section">
        <label className="filter-row">
          <input type="checkbox" checked={includePlanned} onChange={onToggleIncludePlanned} />
          Include planned MetroWest lines (Portishead, Henbury)
        </label>
      </section>

      <section className="filter-section">
        <h2>Legend</h2>
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
                {minutes}
              </span>
            ))}
          </div>
          <p className="frequency-ramp-note">
            Walking counts {WALK_WEIGHT}× a minute on the train — 30 minutes on foot alone scores
            {" "}{Math.round(30 * WALK_WEIGHT)}, on the same scale as the train ride above.
          </p>
          <span className="legend-swatch legend-swatch--muted">
            <i />
            Off the scale entirely, once walking is counted
          </span>
        </div>
      </section>

      {originId && (
        <section className="project-list">
          <h2>
            Destinations <span className="count">({destinations.length})</span>
          </h2>
          {destinations.map(({ station, minutes }) => (
            <div key={station!.id} className="destination-row">
              <span>{station!.name}</span>
              <strong>{minutes >= MAX_MINUTES ? `${Math.round(minutes)}+ min` : `${Math.round(minutes)} min`}</strong>
            </div>
          ))}
          {destinations.length === 0 && (
            <p className="empty-state">No rail service from this station in this band.</p>
          )}
        </section>
      )}
    </div>
  );
}
