import { useMemo, useState } from "react";
import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";
import { projects } from "./data/projects";
import type { ProjectCategory } from "./types/project";
import "./App.css";

const ALL_CATEGORIES: ProjectCategory[] = [
  "liveable_neighbourhood",
  "cycle_infra",
  "major_corridor",
  "rail_metrobus",
];

function App() {
  const [activeCategories, setActiveCategories] = useState<Set<ProjectCategory>>(
    new Set(ALL_CATEGORIES),
  );
  const [showCycleNetwork, setShowCycleNetwork] = useState(true);
  const [showBusStops, setShowBusStops] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredProjects = useMemo(
    () => projects.filter((p) => activeCategories.has(p.category)),
    [activeCategories],
  );

  const toggleCategory = (category: ProjectCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
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
