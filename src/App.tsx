import { useMemo, useState } from "react";
import { MapView } from "./components/MapView";
import { Sidebar, type SidebarMode } from "./components/Sidebar";
import { projects } from "./data/projects";
import { ALL_STATUSES, type ProjectCategory, type ProjectStatus } from "./types/project";
import type { DayType, Daypart } from "./types/rail";
import { stationArrivalTimes } from "./lib/railReach";
import "./App.css";

const ALL_CATEGORIES: ProjectCategory[] = [
  "liveable_neighbourhood",
  "cycle_infra",
  "bus_routes",
  "rail",
];

function App() {
  const [activeCategories, setActiveCategories] = useState<Set<ProjectCategory>>(
    new Set(ALL_CATEGORIES),
  );
  const [activeStatuses, setActiveStatuses] = useState<Set<ProjectStatus>>(
    new Set(ALL_STATUSES),
  );
  const [showCycleNetwork, setShowCycleNetwork] = useState(true);
  const [showBusRoutes, setShowBusRoutes] = useState(false);
  const [showRailNetwork, setShowRailNetwork] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [mode, setMode] = useState<SidebarMode>("projects");
  const [originId, setOriginId] = useState<string | null>(null);
  const [dayType, setDayType] = useState<DayType>("weekday");
  const [daypart, setDaypart] = useState<Daypart>("midday");
  const [headwayOverride, setHeadwayOverride] = useState<number | null>(null);
  const [includePlanned, setIncludePlanned] = useState(false);

  const arrivals = useMemo(() => {
    if (mode !== "frequency" || !originId) return null;
    return stationArrivalTimes({ originId, dayType, daypart, headwayOverride, includePlanned });
  }, [mode, originId, dayType, daypart, headwayOverride, includePlanned]);

  const filteredProjects = useMemo(
    () =>
      projects.filter((p) => activeCategories.has(p.category) && activeStatuses.has(p.status)),
    [activeCategories, activeStatuses],
  );

  const statusesWithProjects = useMemo(
    () => ALL_STATUSES.filter((status) => projects.some((p) => p.status === status)),
    [],
  );

  const toggleCategory = (category: ProjectCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const toggleStatus = (status: ProjectStatus) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  return (
    <div className="app-layout">
      <Sidebar
        projects={filteredProjects}
        allCategories={ALL_CATEGORIES}
        activeCategories={activeCategories}
        onToggleCategory={toggleCategory}
        allStatuses={statusesWithProjects}
        activeStatuses={activeStatuses}
        onToggleStatus={toggleStatus}
        showCycleNetwork={showCycleNetwork}
        onToggleCycleNetwork={() => setShowCycleNetwork((v) => !v)}
        showBusRoutes={showBusRoutes}
        onToggleBusRoutes={() => setShowBusRoutes((v) => !v)}
        showRailNetwork={showRailNetwork}
        onToggleRailNetwork={() => setShowRailNetwork((v) => !v)}
        selectedId={selectedId}
        onSelect={setSelectedId}
        mode={mode}
        onModeChange={setMode}
        originId={originId}
        onSelectOrigin={setOriginId}
        dayType={dayType}
        onDayType={setDayType}
        daypart={daypart}
        onDaypart={setDaypart}
        headwayOverride={headwayOverride}
        onHeadwayOverride={setHeadwayOverride}
        includePlanned={includePlanned}
        onToggleIncludePlanned={() => setIncludePlanned((v) => !v)}
        arrivals={arrivals}
      />
      <MapView
        allProjects={projects}
        projects={filteredProjects}
        selectedId={selectedId}
        onSelect={setSelectedId}
        showCycleNetwork={showCycleNetwork}
        showBusRoutes={showBusRoutes}
        showRailNetwork={showRailNetwork}
        mode={mode}
        originId={originId}
        onSelectOrigin={setOriginId}
        includePlanned={includePlanned}
        arrivals={arrivals}
      />
    </div>
  );
}

export default App;
