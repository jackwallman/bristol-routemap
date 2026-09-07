import { lines as railLines } from "../data/rail-service";
import type { DayType, Daypart, RailLine } from "../types/rail";

// "Just missed it by 30 seconds" — the premise of the whole feature.
const MISSED_BY_MINUTES = 0.5;
// Platform-to-platform time at an interchange, on top of the wait for the connecting train.
const INTERCHANGE_MINUTES = 5;

export interface ReachOptions {
  originId: string;
  dayType: DayType;
  daypart: Daypart;
  /** When set, replaces every running line's headway — "what if it were frequent?" */
  headwayOverride: number | null;
  includePlanned: boolean;
}

interface Ride {
  arrival: number;
  lineId: string;
}

function effectiveHeadway(line: RailLine, opts: ReachOptions): number | null {
  const scheduled = line.headways[opts.dayType][opts.daypart];
  if (scheduled === null) return null; // no service in this band — the override can't invent one
  return opts.headwayOverride !== null ? opts.headwayOverride : scheduled;
}

function eligibleLines(opts: ReachOptions): RailLine[] {
  return railLines.filter((line) => {
    if (line.serviceStatus === "planned" && !opts.includePlanned) return false;
    return effectiveHeadway(line, opts) !== null;
  });
}

function rideMinutesBetween(line: RailLine, fromIndex: number, toIndex: number): number {
  const [lo, hi] = fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
  let total = 0;
  for (let i = lo; i < hi; i++) total += line.legMinutes[i];
  return total;
}

/** Every other station reachable by riding `line` from `stationId`, given a fixed boarding cost already incurred there. */
function ridesFrom(
  stationId: string,
  arrivalAtStation: number,
  line: RailLine,
  boardingCost: number,
): Map<string, Ride> {
  const results = new Map<string, Ride>();
  const fromIndex = line.stations.indexOf(stationId);
  if (fromIndex === -1) return results;
  line.stations.forEach((otherId, i) => {
    if (i === fromIndex) return;
    results.set(otherId, {
      arrival: arrivalAtStation + boardingCost + rideMinutesBetween(line, fromIndex, i),
      lineId: line.id,
    });
  });
  return results;
}

function keepBest(best: Map<string, Ride>, candidate: Map<string, Ride>): void {
  candidate.forEach((ride, stationId) => {
    const existing = best.get(stationId);
    if (!existing || ride.arrival < existing.arrival) best.set(stationId, ride);
  });
}

/**
 * Minutes from standing on the origin platform to standing on each other station's
 * platform, having just missed the train that would have left MISSED_BY_MINUTES ago.
 * Allows at most one change, at the *average* wait for the connecting line (half its
 * headway) plus a fixed interchange time — you don't choose when you arrive at the
 * interchange, so the honest figure is the average wait, not the best case.
 *
 * This keeps only the fastest way found so far to reach each station, so a station
 * reachable by two lines occasionally loses the option to interchange via whichever
 * line got there slower — an acceptable simplification on a ~30-station network for a
 * one-change, illustrative map rather than an exact journey planner.
 */
export function stationArrivalTimes(opts: ReachOptions): Map<string, number> {
  const usable = eligibleLines(opts);
  const best = new Map<string, Ride>();
  best.set(opts.originId, { arrival: 0, lineId: "" });

  const firstLines = usable.filter((line) => line.stations.includes(opts.originId));
  firstLines.forEach((line) => {
    const headway = effectiveHeadway(line, opts)!;
    const boardingCost = Math.max(0, headway - MISSED_BY_MINUTES);
    keepBest(best, ridesFrom(opts.originId, 0, line, boardingCost));
  });

  // One connection, from a snapshot of the direct-ride results only — chaining a second
  // connection on top would exceed the one-change premise.
  const afterFirstLeg = new Map(best);
  afterFirstLeg.forEach((ride, stationId) => {
    if (stationId === opts.originId) return;
    const connectingLines = usable.filter(
      (line) => line.id !== ride.lineId && line.stations.includes(stationId),
    );
    connectingLines.forEach((line) => {
      const headway = effectiveHeadway(line, opts)!;
      keepBest(best, ridesFrom(stationId, ride.arrival, line, headway / 2 + INTERCHANGE_MINUTES));
    });
  });

  const arrivals = new Map<string, number>();
  best.forEach((ride, stationId) => arrivals.set(stationId, ride.arrival));
  return arrivals;
}
