export type ProjectCategory =
  | "liveable_neighbourhood"
  | "cycle_infra"
  | "bus_routes"
  | "rail";

export type ProjectStatus =
  | "proposed"
  | "consultation"
  | "approved"
  | "underway"
  | "completed"
  | "unknown"
  | "speculation";

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
  /** 2-4 short bullet phrases summarising the project, for the card. Drawn from `description`, not new facts. */
  highlights?: string[];
  /** [lon, lat] — marker position; a representative point even when geometryUrl is set */
  coordinates: [number, number];
  /** Path under /data to a GeoJSON file highlighting the actual area/route, if we have one */
  geometryUrl?: string;
  geometryType?: "line" | "polygon";
}

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  liveable_neighbourhood: "Neighbourhood street schemes",
  cycle_infra: "Cycle infrastructure",
  bus_routes: "Bus routes",
  rail: "Rail",
};

export const CATEGORY_COLORS: Record<ProjectCategory, string> = {
  liveable_neighbourhood: "#2e7d32",
  cycle_infra: "#1565c0",
  bus_routes: "#c62828",
  rail: "#6a1b9a",
};

export const ALL_STATUSES: ProjectStatus[] = [
  "proposed",
  "consultation",
  "approved",
  "underway",
  "completed",
  "unknown",
  "speculation",
];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  proposed: "Proposed",
  consultation: "In consultation",
  approved: "Approved",
  underway: "Underway",
  completed: "Completed",
  unknown: "Status unknown",
  speculation: "Speculation",
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  proposed: "#b45309",
  consultation: "#1d4ed8",
  approved: "#0f766e",
  underway: "#15803d",
  completed: "#57534e",
  unknown: "#4b5563",
  speculation: "#a21caf",
};
