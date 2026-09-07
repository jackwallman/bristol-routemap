import { lines, stations, stationsById } from "../data/rail-service";
import {
  ALL_DAY_TYPES,
  ALL_DAYPARTS,
  DAY_TYPE_LABELS,
  DAYPART_LABELS,
  type DayType,
  type Daypart,
} from "../types/rail";
import { BANDS, MAX_MINUTES, WALK_CAP_OPTIONS } from "../lib/travelSurface";

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
  walkCapMinutes: number;
  onWalkCap: (minutes: number) => void;
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
  walkCapMinutes,
  onWalkCap,
}: FrequencyPanelProps) {
  const visibleStations = stations
    .filter((s) => s.crs || includePlanned)
    .sort((a, b) => a.name.localeCompare(b.name));

  const originLines = originId
    ? lines.filter((l) => l.stations.includes(originId) && (includePlanned || l.serviceStatus !== "planned"))
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
        walking the rest of the way at a normal pace. The shading only covers what's within a
        {" "}{walkCapMinutes}-minute walk of a station, since that's about as far as most people
        will walk to or from a train. On an infrequent line, the wait can matter more than the
        ride.
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
          {ALL_DAY_TYPES.map((dt) => (
            <button
              key={dt}
              type="button"
              className={"status-pill" + (dayType === dt ? "" : " status-pill--inactive")}
              style={dayType === dt ? { backgroundColor: "#2a78d6" } : undefined}
              onClick={() => onDayType(dt)}
              aria-pressed={dayType === dt}
            >
              {DAY_TYPE_LABELS[dt]}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h2>Time of day</h2>
        <div className="status-pills">
          {ALL_DAYPARTS.map((dp) => {
            const active = daypart === dp;
            const hasService = daypartHasService(dp);
            return (
              <button
                key={dp}
                type="button"
                className={"status-pill" + (active ? "" : " status-pill--inactive")}
                style={active ? { backgroundColor: "#2a78d6" } : undefined}
                onClick={() => onDaypart(dp)}
                aria-pressed={active}
                disabled={!hasService}
                title={hasService ? undefined : "No service from this station in this band"}
              >
                {DAYPART_LABELS[dp]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="filter-section">
        <h2>How far will you walk?</h2>
        <div className="status-pills">
          {WALK_CAP_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={"status-pill" + (walkCapMinutes === minutes ? "" : " status-pill--inactive")}
              style={walkCapMinutes === minutes ? { backgroundColor: "#2a78d6" } : undefined}
              onClick={() => onWalkCap(minutes)}
              aria-pressed={walkCapMinutes === minutes}
            >
              {minutes} min walk
            </button>
          ))}
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
          {BANDS.map((band) => (
            <span key={band.maxMinutes} className="legend-swatch">
              <i style={{ backgroundColor: band.color }} />
              {band.label}
            </span>
          ))}
          <span className="legend-swatch legend-swatch--muted">
            <i />
            Over {MAX_MINUTES} min, or over a {walkCapMinutes} min walk from a station
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
