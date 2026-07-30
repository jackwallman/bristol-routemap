export type ProjectCategory =
  | "liveable_neighbourhood"
  | "cycle_infra"
  | "major_corridor"
  | "rail_metrobus";

export type ProjectStatus =
  | "proposed"
  | "consultation"
  | "approved"
  | "underway"
  | "completed"
  | "unknown";

export interface Project {
  id: string;
  name: string;
  area: string;
  category: ProjectCategory;
  status: ProjectStatus;
  description: string;
  sourceName: string;
  sourceUrl: string;
  /** Additional deep links, for entries that cover more than one programme */
  extraLinks?: { name: string; url: string }[];
  /** ISO date this entry was last checked against its source (manual or AI-assisted pass) */
  lastUpdated: string;
  startDate?: string;
  endDate?: string;
  /** [lon, lat] — marker position; a representative point even when geometryUrl is set */
  coordinates: [number, number];
  /** Path under /data to a GeoJSON file highlighting the actual area/route, if we have one */
  geometryUrl?: string;
  geometryType?: "line" | "polygon";
}

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  liveable_neighbourhood: "Liveable Neighbourhoods",
  cycle_infra: "Cycle infrastructure",
  major_corridor: "Major corridors",
  rail_metrobus: "Rail / MetroBus",
};

export const CATEGORY_COLORS: Record<ProjectCategory, string> = {
  liveable_neighbourhood: "#2e7d32",
  cycle_infra: "#1565c0",
  major_corridor: "#c62828",
  rail_metrobus: "#6a1b9a",
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  proposed: "Proposed",
  consultation: "In consultation",
  approved: "Approved",
  underway: "Underway",
  completed: "Completed",
  unknown: "Status unknown",
};
