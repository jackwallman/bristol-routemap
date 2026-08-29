import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { Project, ProjectCategory } from "../types/project";
import { CATEGORY_COLORS, CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from "../types/project";
import { CategoryIcon } from "./CategoryIcon";
import { ThemeToggle } from "./ThemeToggle";

// Mobile-only bottom sheet: the puller drags .sidebar's height (vh) between
// these three snap points, matching the Google Maps app's peek/half/full feel.
// Irrelevant on desktop, where CSS keeps .sidebar's height at 100% regardless.
const SHEET_PEEK_VH = 14;
const SHEET_HALF_VH = 45;
const SHEET_FULL_VH = 88;
const SHEET_SNAP_POINTS = [SHEET_PEEK_VH, SHEET_HALF_VH, SHEET_FULL_VH];

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
  const [sheetHeightVh, setSheetHeightVh] = useState(SHEET_HALF_VH);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{ startY: number; startHeightVh: number } | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current.get(selectedId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // Selecting a project (from a card or a map marker) should surface the map,
    // so drop the sheet out of the way if it's covering most of the screen.
    setSheetHeightVh((h) => (h > SHEET_HALF_VH ? SHEET_HALF_VH : h));
  }, [selectedId]);

  const handlePullerPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = { startY: e.clientY, startHeightVh: sheetHeightVh };
    setIsDragging(true);
  };

  const handlePullerPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const deltaVh = ((drag.startY - e.clientY) / window.innerHeight) * 100;
    const next = Math.min(SHEET_FULL_VH, Math.max(SHEET_PEEK_VH, drag.startHeightVh + deltaVh));
    setSheetHeightVh(next);
  };

  const handlePullerPointerUp = () => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    setIsDragging(false);
    setSheetHeightVh((h) =>
      SHEET_SNAP_POINTS.reduce((closest, point) =>
        Math.abs(point - h) < Math.abs(closest - h) ? point : closest,
      ),
    );
  };

  return (
    <aside
      className={"sidebar" + (isDragging ? " sidebar--dragging" : "")}
      style={{ "--sheet-height": `${sheetHeightVh}vh` } as CSSProperties}
    >
      <div
        className="sheet-puller"
        onPointerDown={handlePullerPointerDown}
        onPointerMove={handlePullerPointerMove}
        onPointerUp={handlePullerPointerUp}
        onPointerCancel={handlePullerPointerUp}
      >
        <span className="sheet-puller-bar" />
      </div>
      <div className="sidebar-scroll">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <img src="/logo.svg" alt="" className="sidebar-logo" width={28} height={28} />
            <h1>Get About Bristol</h1>
          </div>
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
              <CategoryIcon
                category={category}
                className="filter-icon"
                style={{ color: CATEGORY_COLORS[category] } as CSSProperties}
              />
              {CATEGORY_LABELS[category]}
            </label>
          ))}
          <p className="filter-hint">
            Neighbourhood street schemes and corridor projects are highlighted as areas/routes on the
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
              style={{ "--card-accent": CATEGORY_COLORS[project.category] } as CSSProperties}
              onClick={() => onSelect(project.id)}
            >
              <div className="project-card-header">
                <span className="project-name">
                  <CategoryIcon category={project.category} className="project-name-icon" />
                  {project.name}
                </span>
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
      </div>
    </aside>
  );
}
