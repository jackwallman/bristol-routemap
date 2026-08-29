import { useMemo, useState } from "react";
import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";
import { projects } from "./data/projects";
import { ALL_STATUSES, type ProjectCategory, type ProjectStatus } from "./types/project";
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
  const [showBusStops, setShowBusStops] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        showBusStops={showBusStops}
        onToggleBusStops={() => setShowBusStops((v) => !v)}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <MapView
        allProjects={projects}
        projects={filteredProjects}
        selectedId={selectedId}
        onSelect={setSelectedId}
        showCycleNetwork={showCycleNetwork}
        showBusStops={showBusStops}
      />
    </div>
  );
}

export default App;
