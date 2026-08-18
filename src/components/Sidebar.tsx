import { useEffect, useRef } from "react";
import type { Project, ProjectCategory } from "../types/project";
import { CATEGORY_COLORS, CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from "../types/project";
import { ThemeToggle } from "./ThemeToggle";

interface SidebarProps {
  projects: Project[];
  allCategories: ProjectCategory[];
  activeCategories: Set<ProjectCategory>;
  onToggleCategory: (category: ProjectCategory) => void;
  showCycleNetwork: boolean;
  onToggleCycleNetwork: () => void;
  showBusStops: boolean;
  onToggleBusStops: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function Sidebar({
  projects,
  allCategories,
  activeCategories,
  onToggleCategory,
  showCycleNetwork,
  onToggleCycleNetwork,
  showBusStops,
  onToggleBusStops,
  selectedId,
  onSelect,
}: SidebarProps) {
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current.get(selectedId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Get About Bristol</h1>
        <ThemeToggle />
      </div>
      <p className="sidebar-subtitle">Transport infrastructure projects, in one place</p>

      <section className="filter-section">
        <h2>Categories</h2>
        {allCategories.map((category) => (
          <label key={category} className="filter-row">
            <input
              type="checkbox"
              checked={activeCategories.has(category)}
              onChange={() => onToggleCategory(category)}
            />
            <span className="swatch" style={{ backgroundColor: CATEGORY_COLORS[category] }} />
            {CATEGORY_LABELS[category]}
          </label>
        ))}
        <p className="filter-hint">
          Liveable Neighbourhoods and corridor projects are highlighted as areas/routes on the
          map where we have geometry for them — see each project card for source and accuracy.
        </p>
      </section>

      <section className="filter-section">
        <h2>Map layers</h2>
        <label className="filter-row">
          <input type="checkbox" checked={showCycleNetwork} onChange={onToggleCycleNetwork} />
          Cycle network (Open Data Bristol)
        </label>
        {showCycleNetwork && (
          <div className="cycle-legend">
            <span>
              <i className="legend-line legend-line--existing" /> Existing
            </span>
            <span>
              <i className="legend-line legend-line--proposed" /> Proposed / planned
            </span>
            <span>
              <i className="legend-line legend-line--aspirational" /> Aspirational
            </span>
          </div>
        )}
        <label className="filter-row">
          <input type="checkbox" checked={showBusStops} onChange={onToggleBusStops} />
          Bus stops (Open Data Bristol)
        </label>
      </section>

      <section className="project-list">
        <h2>
          Projects <span className="count">({projects.length})</span>
        </h2>
        {projects.map((project) => (
          <button
            key={project.id}
            ref={(el) => {
              if (el) cardRefs.current.set(project.id, el);
              else cardRefs.current.delete(project.id);
            }}
            className={"project-card" + (project.id === selectedId ? " project-card--selected" : "")}
            onClick={() => onSelect(project.id)}
          >
            <div className="project-card-header">
              <span className="project-name">{project.name}</span>
              <span
                className="status-badge"
                style={{ backgroundColor: STATUS_COLORS[project.status] }}
              >
                {STATUS_LABELS[project.status]}
              </span>
            </div>
            {(project.startDate || project.endDate) && (
              <div className="project-dates">
                {project.startDate && (
                  <span>
                    <strong>Start</strong> {project.startDate}
                  </span>
                )}
                {project.endDate && (
                  <span>
                    <strong>Finish</strong> {project.endDate}
                  </span>
                )}
              </div>
            )}
            <div className="project-area">{project.area}</div>
            {project.highlights && project.highlights.length > 0 && (
              <ul className="project-highlights">
                {project.highlights.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            )}
            <details className="project-description-details" onClick={(e) => e.stopPropagation()}>
              <summary>Full description</summary>
              <p className="project-description">{project.description}</p>
            </details>
            <div className="project-meta">
              <a href={project.sourceUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                {project.sourceName} ↗
              </a>
              {project.extraLinks?.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {link.name} ↗
                </a>
              ))}
              <span className="project-updated">Checked {project.lastUpdated}</span>
            </div>
          </button>
        ))}
        {projects.length === 0 && <p className="empty-state">No projects match the current filters.</p>}
      </section>
    </aside>
  );
}
