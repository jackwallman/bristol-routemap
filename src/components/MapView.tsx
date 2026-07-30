import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Project } from "../types/project";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "../types/project";

const BRISTOL_CENTER: [number, number] = [-2.5879, 51.4545];

// Free, no-API-key vector basemap (OSM data, hosted by OpenFreeMap). We fetch
// "positron" — a light, muted style — and boost its parks/water back to
// color so highlighted routes and place names stand out against a quiet grey
// backdrop, similar to the Bristol on the Move house style.
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

async function loadMutedStyle(): Promise<maplibregl.StyleSpecification> {
  const style = await fetch(STYLE_URL).then((res) => res.json());
  const byId = (id: string) => style.layers.find((l: { id: string }) => l.id === id);

  const park = byId("park");
  if (park) park.paint["fill-color"] = "#b7dfae";

  const wood = byId("landcover_wood");
  if (wood) wood.paint["fill-color"] = "#bfe0b6";

  const water = byId("water");
  if (water) water.paint["fill-color"] = "#a9cee0";

  const waterwayLabel = byId("waterway");
  if (waterwayLabel) waterwayLabel.paint["line-color"] = "#a9cee0";

  return style;
}

type LngLat = [number, number];
type Bounds = [LngLat, LngLat];
type SimpleGeometry = { type: string; coordinates: unknown };
type SimpleFeature = { type: "Feature"; properties: Record<string, unknown>; geometry: SimpleGeometry };
type SimpleFeatureCollection = { type: "FeatureCollection"; features: SimpleFeature[] };

interface MapViewProps {
  /** Full, unfiltered project list — used once to build corridor/boundary layers. */
  allProjects: Project[];
  /** Filtered list — drives markers and layer visibility. */
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  showCycleNetwork: boolean;
  showBusStops: boolean;
}

function extendBounds(bounds: Bounds | null, coord: LngLat): Bounds {
  if (!bounds) return [coord, coord];
  return [
    [Math.min(bounds[0][0], coord[0]), Math.min(bounds[0][1], coord[1])],
    [Math.max(bounds[1][0], coord[0]), Math.max(bounds[1][1], coord[1])],
  ];
}

function geometryBounds(geometry: SimpleGeometry): Bounds | null {
  let bounds: Bounds | null = null;
  const visit = (coords: unknown): void => {
    if (Array.isArray(coords) && typeof coords[0] === "number") {
      bounds = extendBounds(bounds, coords as LngLat);
    } else if (Array.isArray(coords)) {
      coords.forEach(visit);
    }
  };
  visit(geometry.coordinates);
  return bounds;
}

export function MapView({
  allProjects,
  projects,
  selectedId,
  onSelect,
  showCycleNetwork,
  showBusStops,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const corridorBoundsRef = useRef<Record<string, Bounds>>({});
  const corridorLayerIdsRef = useRef<Record<string, string[]>>({});
  // Click/hover priority: lines (roads, rail, cycle corridors) checked before
  // area fills, so a route drawn over an LN polygon stays clickable on top.
  const lineLayerIdsRef = useRef<string[]>([]);
  const fillLayerIdsRef = useRef<string[]>([]);
  const layerToProjectIdRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: BRISTOL_CENTER,
      zoom: 12,
    });
    // Passing `style` via the constructor silently fails to apply on this
    // maplibre-gl version when the container isn't yet in the layout tree;
    // setting it explicitly after construction works reliably. We fetch the
    // style ourselves (to mutate it), so — unlike a plain URL passed to
    // setStyle — nothing aborts this fetch if StrictMode's double-effect
    // removes this map before it resolves; `cancelled` guards against that
    // stale call landing on an already-removed map instance.
    let cancelled = false;
    loadMutedStyle().then((style) => {
      if (!cancelled) map.setStyle(style);
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("cycle-network", {
        type: "geojson",
        data: "/data/cycle_network.geojson",
      });
      // Existing routes: solid. Planned/proposed: dashed. Aspirational: faint dashed.
      map.addLayer({
        id: "cycle-network-line",
        type: "line",
        source: "cycle-network",
        paint: {
          "line-color": [
            "match",
            ["get", "R_STATUS"],
            "Existing",
            "#9ec9e8",
            ["Proposed", "Planned"],
            "#f57c00",
            "Aspirational",
            "#c2c2c2",
            "#9ec9e8",
          ],
          "line-width": ["match", ["get", "R_STATUS"], ["Proposed", "Planned"], 4, "Existing", 1.5, 1.25],
          "line-opacity": [
            "match",
            ["get", "R_STATUS"],
            ["Proposed", "Planned"],
            0.95,
            "Aspirational",
            0.35,
            0.6,
          ],
          "line-dasharray": ["match", ["get", "R_STATUS"], "Existing", ["literal", [1, 0]], ["literal", [2, 1.5]]],
        },
        layout: { visibility: "none" },
      });

      map.addSource("bus-stops", {
        type: "geojson",
        data: "/data/bus_stops.geojson",
      });
      map.addLayer({
        id: "bus-stops-point",
        type: "circle",
        source: "bus-stops",
        paint: {
          "circle-radius": 3,
          "circle-color": "#f57c00",
          "circle-opacity": 0.7,
        },
        layout: { visibility: "none" },
      });

      // Corridor / boundary highlight layers, one per project that has geometry.
      // Fetched in parallel but added in a fixed order (all area fills first,
      // then all route lines) so lines always paint — and hit-test — on top.
      const geometryProjects = allProjects.filter((p) => p.geometryUrl);
      Promise.all(
        geometryProjects.map((project) =>
          fetch(project.geometryUrl!)
            .then((res) => res.json())
            .then((geojson: SimpleFeatureCollection) => ({ project, geojson })),
        ),
      ).then((loaded) => {
        if (!mapRef.current) return;

        for (const { project, geojson } of loaded) {
          let bounds: Bounds | null = null;
          geojson.features.forEach((f) => {
            const b = geometryBounds(f.geometry);
            if (b)
              bounds = bounds
                ? [
                    [Math.min(bounds[0][0], b[0][0]), Math.min(bounds[0][1], b[0][1])],
                    [Math.max(bounds[1][0], b[1][0]), Math.max(bounds[1][1], b[1][1])],
                  ]
                : b;
          });
          if (bounds) corridorBoundsRef.current[project.id] = bounds;
          map.addSource(`corridor-${project.id}`, { type: "geojson", data: geojson });
        }

        const visibleIds = new Set(projects.map((p) => p.id));

        // Pass 1: area fills (bottom).
        for (const { project } of loaded) {
          if (project.geometryType !== "polygon") continue;
          const sourceId = `corridor-${project.id}`;
          const color = CATEGORY_COLORS[project.category];
          const visibility = visibleIds.has(project.id) ? "visible" : "none";

          map.addLayer({
            id: `${sourceId}-fill`,
            type: "fill",
            source: sourceId,
            paint: { "fill-color": color, "fill-opacity": 0.28 },
            layout: { visibility },
          });
          map.addLayer({
            id: `${sourceId}-outline`,
            type: "line",
            source: sourceId,
            paint: { "line-color": color, "line-width": 3 },
            layout: { visibility },
          });
          corridorLayerIdsRef.current[project.id] = [`${sourceId}-fill`, `${sourceId}-outline`];
          fillLayerIdsRef.current.push(`${sourceId}-fill`);
          layerToProjectIdRef.current[`${sourceId}-fill`] = project.id;
        }

        // Pass 2: route lines (top).
        for (const { project } of loaded) {
          if (project.geometryType !== "line") continue;
          const sourceId = `corridor-${project.id}`;
          const color = CATEGORY_COLORS[project.category];
          const visibility = visibleIds.has(project.id) ? "visible" : "none";

          map.addLayer({
            id: `${sourceId}-casing`,
            type: "line",
            source: sourceId,
            paint: { "line-color": "#ffffff", "line-width": 10, "line-opacity": 0.95 },
            layout: { visibility, "line-cap": "round", "line-join": "round" },
          });
          map.addLayer({
            id: `${sourceId}-line`,
            type: "line",
            source: sourceId,
            paint: { "line-color": color, "line-width": 6.5, "line-opacity": 1 },
            layout: { visibility, "line-cap": "round", "line-join": "round" },
          });
          corridorLayerIdsRef.current[project.id] = [`${sourceId}-casing`, `${sourceId}-line`];
          lineLayerIdsRef.current.push(`${sourceId}-line`);
          layerToProjectIdRef.current[`${sourceId}-line`] = project.id;
        }

        // Single consolidated handler: lines win over fills when both are hit,
        // so a highlighted route stays clickable where it crosses an LN area.
        const pickProjectAt = (point: maplibregl.PointLike): string | null => {
          const lineHits = map.queryRenderedFeatures(point, { layers: lineLayerIdsRef.current });
          if (lineHits.length > 0) return layerToProjectIdRef.current[lineHits[0].layer.id] ?? null;
          const fillHits = map.queryRenderedFeatures(point, { layers: fillLayerIdsRef.current });
          if (fillHits.length > 0) return layerToProjectIdRef.current[fillHits[0].layer.id] ?? null;
          return null;
        };

        map.on("click", (e) => {
          const projectId = pickProjectAt(e.point);
          if (projectId) onSelect(projectId);
        });
        map.on("mousemove", (e) => {
          map.getCanvas().style.cursor = pickProjectAt(e.point) ? "pointer" : "";
        });
      });
    });

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const setVis = () => {
      if (map.getLayer("cycle-network-line")) {
        map.setLayoutProperty("cycle-network-line", "visibility", showCycleNetwork ? "visible" : "none");
      }
      if (map.getLayer("bus-stops-point")) {
        map.setLayoutProperty("bus-stops-point", "visibility", showBusStops ? "visible" : "none");
      }
    };
    if (map.isStyleLoaded()) setVis();
    else map.once("load", setVis);
  }, [showCycleNetwork, showBusStops]);

  // Toggle corridor/boundary layer visibility to match the active category filters.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const visibleIds = new Set(projects.map((p) => p.id));
    Object.entries(corridorLayerIdsRef.current).forEach(([projectId, layerIds]) => {
      const visibility = visibleIds.has(projectId) ? "visible" : "none";
      layerIds.forEach((layerId) => {
        if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visibility);
      });
    });
  }, [projects]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    projects.forEach((project) => {
      const el = document.createElement("button");
      el.className = "map-marker";
      el.style.backgroundColor = CATEGORY_COLORS[project.category] ?? "#555";
      el.title = `${project.name} — ${CATEGORY_LABELS[project.category]}`;
      el.setAttribute("aria-label", project.name);
      el.onclick = () => onSelect(project.id);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(project.coordinates)
        .addTo(map);
      markersRef.current[project.id] = marker;
    });
  }, [projects, onSelect]);

  // Highlight the selected corridor/boundary, and fit the view to it (or fly to
  // the point marker for projects with no geometry).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.entries(corridorLayerIdsRef.current).forEach(([projectId, layerIds]) => {
      const selected = projectId === selectedId;
      layerIds.forEach((layerId) => {
        if (!map.getLayer(layerId)) return;
        if (layerId.endsWith("-line")) {
          map.setPaintProperty(layerId, "line-width", selected ? 8.5 : 6.5);
          map.setPaintProperty(layerId, "line-opacity", 1);
        } else if (layerId.endsWith("-fill")) {
          map.setPaintProperty(layerId, "fill-opacity", selected ? 0.4 : 0.28);
        } else if (layerId.endsWith("-outline")) {
          map.setPaintProperty(layerId, "line-width", selected ? 4.5 : 3);
        }
      });
    });

    Object.entries(markersRef.current).forEach(([id, marker]) => {
      marker.getElement().classList.toggle("map-marker--selected", id === selectedId);
    });

    if (!selectedId) return;
    const bounds = corridorBoundsRef.current[selectedId];
    if (bounds) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 });
      return;
    }
    const project = projects.find((p) => p.id === selectedId);
    if (project) {
      map.flyTo({ center: project.coordinates, zoom: 14 });
    }
  }, [selectedId, projects]);

  return <div ref={containerRef} className="map-view" />;
}
