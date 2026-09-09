export type DayType = "weekday" | "saturday" | "sunday";
export type Daypart = "early" | "am_peak" | "midday" | "pm_peak" | "evening";

export const ALL_DAY_TYPES: DayType[] = ["weekday", "saturday", "sunday"];
export const ALL_DAYPARTS: Daypart[] = ["early", "am_peak", "midday", "pm_peak", "evening"];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  weekday: "Weekday",
  saturday: "Saturday",
  sunday: "Sunday",
};

// Boundaries chosen where GB rail timetable cadence actually changes, not on
// the clock hour for its own sake: the weekday am/pm peaks are the two windows
// operators actually timetable extra trains around, and "early"/"evening" are
// where services thin out or stop.
//
// These are storage buckets, not the options the UI offers. Adjacent buckets
// carrying the same headway on every line are merged into one selectable band
// by src/lib/serviceBands.ts, so a pill only ever appears where the frequency
// genuinely changes. Minutes are from midnight; 1440 is end of day.
export const DAYPART_BOUNDS: Record<Daypart, { startMinutes: number; endMinutes: number }> = {
  early: { startMinutes: 0, endMinutes: 420 },
  am_peak: { startMinutes: 420, endMinutes: 570 },
  midday: { startMinutes: 570, endMinutes: 960 },
  pm_peak: { startMinutes: 960, endMinutes: 1140 },
  evening: { startMinutes: 1140, endMinutes: 1440 },
};

export interface Station {
  id: string;
  name: string;
  /** Omitted for planned stations that haven't been allocated a CRS code yet. */
  crs?: string;
  coordinates: [number, number];
}

export type ServiceStatus = "open" | "planned";

export interface RailLine {
  id: string;
  name: string;
  /** Ordered station ids; legMinutes[i] is the ride time from stations[i] to stations[i+1]. */
  stations: string[];
  legMinutes: number[];
  /** Typical minutes between departures. null = no service in that band. */
  headways: Record<DayType, Record<Daypart, number | null>>;
  serviceStatus?: ServiceStatus;
  sourceName: string;
  sourceUrl: string;
  lastUpdated: string;
}
