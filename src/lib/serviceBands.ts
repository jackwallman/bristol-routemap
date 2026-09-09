import {
  ALL_DAYPARTS,
  ALL_DAY_TYPES,
  DAYPART_BOUNDS,
  DAY_TYPE_LABELS,
  type DayType,
  type Daypart,
  type RailLine,
} from "../types/rail";

// The frequency data is stored as a fixed 3 day-types x 5 dayparts grid, because that's the
// shape a timetable is read in. Most of that grid is repetition: a source that says "hourly
// all day, every day" fills fifteen cells with the same number. Offering fifteen buttons for
// five distinct answers implies a precision the data doesn't have, and hides which controls
// actually do something.
//
// So the selector options are derived, not declared: day types and adjacent dayparts whose
// headways are identical on *every* line get collapsed into one option. Record a genuine
// Saturday or peak difference from a timetable and the merged pill splits again on its own.
//
// Merging is computed over the whole network rather than per-origin. Nearly every station
// reaches Temple Meads within one change, so a per-origin computation lands on the same bands
// in practice while making the pills shift about as you change origin.

export interface DayTypeGroup {
  /** Day types sharing an identical timetable. dayTypes[0] is the representative. */
  dayTypes: DayType[];
  label: string;
}

export interface DaypartBand {
  /** Contiguous dayparts sharing an identical headway. dayparts[0] is the representative. */
  dayparts: Daypart[];
  startMinutes: number;
  endMinutes: number;
  label: string;
}

const DAY_GROUP_LABELS: Record<string, string> = {
  "weekday+saturday": "Mon–Sat",
  "weekday+saturday+sunday": "Every day",
  "saturday+sunday": "Weekend",
};

function dayGroupLabel(dayTypes: DayType[]): string {
  return (
    DAY_GROUP_LABELS[dayTypes.join("+")] ?? dayTypes.map((dt) => DAY_TYPE_LABELS[dt]).join(" & ")
  );
}

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "All day", "Before 07:00", "After 19:00" or "07:00–19:00", whichever the span calls for. */
export function formatBand(startMinutes: number, endMinutes: number): string {
  const opensDay = startMinutes === 0;
  const closesDay = endMinutes === 1440;
  if (opensDay && closesDay) return "All day";
  if (opensDay) return `Before ${clock(endMinutes)}`;
  if (closesDay) return `After ${clock(startMinutes)}`;
  return `${clock(startMinutes)}–${clock(endMinutes)}`;
}

/** The headway of every line in a given cell, as a comparable key. */
function headwaySignature(lines: RailLine[], dayType: DayType, daypart: Daypart): string {
  return lines.map((l) => String(l.headways[dayType][daypart])).join(",");
}

/** Day types whose whole timetable is identical across every line, collapsed into one option. */
export function dayTypeGroups(lines: RailLine[]): DayTypeGroup[] {
  const signature = (dayType: DayType) =>
    ALL_DAYPARTS.map((dp) => headwaySignature(lines, dayType, dp)).join("|");

  const groups: { dayTypes: DayType[]; signature: string }[] = [];
  for (const dayType of ALL_DAY_TYPES) {
    const sig = signature(dayType);
    const existing = groups.find((g) => g.signature === sig);
    if (existing) existing.dayTypes.push(dayType);
    else groups.push({ dayTypes: [dayType], signature: sig });
  }

  return groups.map(({ dayTypes }) => ({ dayTypes, label: dayGroupLabel(dayTypes) }));
}

/**
 * Clock bands for the given day, merging adjacent dayparts that carry the same headway on
 * every line. Since a merge needs equality on every line, "no service" (null) never merges
 * into a served band — a band is unambiguously served or not.
 */
export function daypartBands(lines: RailLine[], dayType: DayType): DaypartBand[] {
  const bands: DaypartBand[] = [];
  let previousSignature: string | null = null;

  for (const daypart of ALL_DAYPARTS) {
    const sig = headwaySignature(lines, dayType, daypart);
    const bounds = DAYPART_BOUNDS[daypart];
    const previous = bands[bands.length - 1];

    if (previous && sig === previousSignature) {
      previous.dayparts.push(daypart);
      previous.endMinutes = bounds.endMinutes;
    } else {
      bands.push({
        dayparts: [daypart],
        startMinutes: bounds.startMinutes,
        endMinutes: bounds.endMinutes,
        label: "",
      });
    }
    previousSignature = sig;
  }

  for (const band of bands) band.label = formatBand(band.startMinutes, band.endMinutes);
  return bands;
}
