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
export const DAYPART_LABELS: Record<Daypart, string> = {
  early: "Early (before 07:00)",
  am_peak: "AM peak (07:00–09:30)",
  midday: "Midday (09:30–16:00)",
  pm_peak: "PM peak (16:00–19:00)",
  evening: "Evening (after 19:00)",
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
