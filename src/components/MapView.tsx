import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Project } from "../types/project";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "../types/project";
import { asset } from "../lib/asset";
import type { SidebarMode } from "./Sidebar";
import { stations as railStations, stationsById } from "../data/rail-service";
import { renderSurface, type LngLatBounds, type TravelSurface } from "../lib/travelSurface";
import { FrequencyLegend } from "./FrequencyLegend";

const BRISTOL_CENTER: [number, number] = [-2.5879, 51.4545];

// Amber halo used to mark the selected corridor/boundary — distinct from
// every category color so it reads as "selected" rather than "another category".
const SELECTION_HIGHLIGHT = "#ffc02e";

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
  showRailNetwork: boolean;
  mode: SidebarMode;
  originId: string | null;
  onSelectOrigin: (id: string) => void;
  includePlanned: boolean;
  arrivals: Map<string, number> | null;
}

type ImageCorners = [LngLat, LngLat, LngLat, LngLat];

function boundsToImageCoordinates(bounds: LngLatBounds): ImageCorners {
  return [
    [bounds.west, bounds.north],
    [bounds.east, bounds.north],
    [bounds.east, bounds.south],
    [bounds.west, bounds.south],
  ];
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
  showRailNetwork,
  mode,
  originId,
  onSelectOrigin,
  includePlanned,
  arrivals,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const corridorBoundsRef = useRef<Record<string, Bounds>>({});
  const corridorLayerIdsRef = useRef<Record<string, string[]>>({});
  const surfaceRef = useRef<TravelSurface | null>(null);
  const surfacePopupRef = useRef<maplibregl.Popup | null>(null);
  // Holds the latest "recompute and repaint the surface for the current viewport" closure, kept
  // current by the arrivals effect below and invoked both from there and from the map's own
  // moveend handler (registered once at mount, so it can't close over a fresh `arrivals` itself).
  const redrawSurfaceRef = useRef<() => void>(() => {});
  // Corridor layers are built asynchronously (after their geometry fetches resolve), so
  // their initial visibility can't just read the `mode` prop from the mount effect's
  // closure — that would freeze at whatever mode was active on first render. A ref kept
  // in sync by the effect below gives that one-time setup the current mode instead.
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  // Read by the surface hover handler, registered once at mount — same reasoning as modeRef.
  const originIdRef = useRef(originId);
  useEffect(() => {
    originIdRef.current = originId;
  }, [originId]);
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
      if (cancelled) return;
      map.setStyle(style);
      // This effect runs before flex layout has given the container its final
      // size, so maplibre measures 0x0 and falls back to a 400x300 canvas.
      // It will not correct that on its own: maplibre's internal ResizeObserver
      // deliberately discards its first callback, and because the style arrives
      // via setStyle rather than the constructor, the usual initial-resize path
      // never runs either. Re-measure now that the style is in place, and force
      // the frame that paints it — without this the map stays blank until
      // something else (a window resize, a click) happens to trigger a render.
      map.resize();
      map.redraw();
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("cycle-network", {
        type: "geojson",
        data: asset("/data/cycle_network.geojson"),
        attribution: "Cycle network © Open Data Bristol",
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

      map.addSource("rail-network", {
        type: "geojson",
        data: asset("/data/rail_network.geojson"),
        attribution: "Rail network © OpenStreetMap contributors",
      });
      map.addLayer({
        id: "rail-network-line",
        type: "line",
        source: "rail-network",
        paint: {
          "line-color": "#5c5c5c",
          "line-width": 1.5,
          "line-opacity": 0.7,
        },
        layout: { visibility: "none" },
      });

      // rail_network.geojson is deliberately "what exists" — it excludes railway=construction —
      // and the project corridor layers are all hidden in frequency mode. Without these, the
      // Portishead and Henbury stations would be dots floating in empty space whenever
      // "include planned" is on. Dashed, in the same grey, to read as track that isn't there yet.
      for (const planned of [
        { id: "portishead", file: "/data/portishead_line.geojson" },
        { id: "henbury", file: "/data/henbury_line.geojson" },
      ]) {
        map.addSource(`rail-planned-${planned.id}`, {
          type: "geojson",
          data: asset(planned.file),
          attribution: "Rail network © OpenStreetMap contributors",
        });
        map.addLayer({
          id: `rail-planned-${planned.id}-line`,
          type: "line",
          source: `rail-planned-${planned.id}`,
          paint: {
            "line-color": "#5c5c5c",
            "line-width": 1.5,
            "line-opacity": 0.7,
            "line-dasharray": [2, 2],
          },
          layout: { visibility: "none" },
        });
      }

      map.addSource("bus-stops", {
        type: "geojson",
        data: asset("/data/bus_stops.geojson"),
        attribution: "Bus stops © Open Data Bristol",
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

      // "Just missed it" frequency map: station points (clickable, sets the origin)
      // plus the travel-time surface, an image source repainted whenever the origin
      // or its options change (see the `arrivals` effect below). Both start hidden;
      // the mode effect below shows them only in frequency mode.
      map.addSource("rail-stations", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: railStations.map((s) => ({
            type: "Feature",
            properties: { id: s.id, name: s.name, planned: !s.crs },
            geometry: { type: "Point", coordinates: s.coordinates },
          })),
        },
      });
      map.addLayer({
        id: "rail-stations-point",
        type: "circle",
        source: "rail-stations",
        paint: {
          "circle-radius": ["match", ["get", "id"], "", 7, 4],
          "circle-color": "#2b2a27",
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255, 255, 255, 0.92)",
        },
        layout: { visibility: "none" },
        filter: ["!=", ["get", "planned"], true],
      });
      map.addLayer({
        id: "rail-stations-label",
        type: "symbol",
        source: "rail-stations",
        paint: { "text-color": "#33322e", "text-halo-color": "#ffffff", "text-halo-width": 2 },
        layout: {
          visibility: "none",
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-anchor": "left",
          "text-offset": [0.7, 0],
          "text-font": ["Noto Sans Regular"],
          // Without these, the basemap's own place-name labels almost always win the
          // collision check first and our station labels silently never appear.
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        filter: ["!=", ["get", "planned"], true],
      });
      map.on("click", "rail-stations-point", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) onSelectOrigin(id);
      });

      const firstSymbolLayerId = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
      map.addSource("travel-surface", {
        type: "image",
        url:
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7",
        coordinates: boundsToImageCoordinates({ west: -2.62, south: 51.44, east: -2.58, north: 51.46 }),
      });
      map.addLayer(
        {
          id: "travel-surface-layer",
          type: "raster",
          source: "travel-surface",
          // Opacity is baked into the surface per-pixel (see renderSurface) — it rises with
          // travel time and feathers out at the walk-cap edge — so the layer itself stays fully
          // opaque and just linearly resamples the rendered pixels.
          paint: { "raster-opacity": 1, "raster-fade-duration": 0, "raster-resampling": "linear" },
          layout: { visibility: "none" },
        },
        firstSymbolLayerId,
      );

      // Hover readout: the real journey to the cursor, read straight out of the last rendered
      // surface rather than sampling the raster layer itself. Walking is weighted on the map (see
      // WALK_WEIGHT), so the readout shows the honest clock time and calls out how much of it is
      // walking rather than just repeating the weighted colour value.
      const surfacePopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "surface-readout",
      });
      surfacePopupRef.current = surfacePopup;
      map.on("mousemove", (e) => {
        if (modeRef.current !== "frequency" || !surfaceRef.current) {
          surfacePopup.remove();
          return;
        }
        const sample = surfaceRef.current.sampleAt(e.lngLat.lng, e.lngLat.lat);
        map.getCanvas().style.cursor = "crosshair";
        if (sample == null) {
          surfacePopup.remove();
          return;
        }
        const originName = originIdRef.current ? stationsById[originIdRef.current]?.name : null;
        const walkNote = sample.walkMinutes >= 0.5 ? `, ${Math.round(sample.walkMinutes)} of it walking` : "";
        surfacePopup
          .setLngLat(e.lngLat)
          .setHTML(`${Math.round(sample.minutes)} min${originName ? ` from ${originName}` : ""}${walkNote}`)
          .addTo(map);
      });
      map.on("mouseout", () => surfacePopup.remove());

      // Keep the surface covering the view as the user pans/zooms — it's sized to the union of
      // the stations' own catchments and the viewport (see renderSurface), so panning away from
      // the origin would otherwise run off the edge of a box sized only for the catchments.
      map.on("moveend", () => {
        if (modeRef.current !== "frequency") return;
        redrawSurfaceRef.current();
      });

      // Corridor / boundary highlight layers, one per project that has geometry.
      // Fetched in parallel but added in a fixed order (all area fills first,
      // then all route lines) so lines always paint — and hit-test — on top.
      const geometryProjects = allProjects.filter((p) => p.geometryUrl);
      Promise.all(
        geometryProjects.map((project) =>
          fetch(asset(project.geometryUrl!))
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
          map.addSource(`corridor-${project.id}`, {
            type: "geojson",
            data: geojson,
            // Project overlays are drawn from a mix of Open Data Bristol and
            // OpenStreetMap/Overpass geometry (see each project's description).
            attribution: "Project boundaries: © OpenStreetMap contributors, Open Data Bristol",
          });
        }

        const visibleIds = new Set(projects.map((p) => p.id));

        // Pass 1: area fills (bottom).
        for (const { project } of loaded) {
          if (project.geometryType !== "polygon") continue;
          const sourceId = `corridor-${project.id}`;
          const color = CATEGORY_COLORS[project.category];
          const visibility = modeRef.current !== "frequency" && visibleIds.has(project.id) ? "visible" : "none";

          map.addLayer({
            id: `${sourceId}-fill`,
            type: "fill",
            source: sourceId,
            paint: { "fill-color": color, "fill-opacity": 0.28 },
            layout: { visibility },
          });
          // Amber halo, invisible until selected — a universal "this one" cue
          // that reads on top of any category color or basemap tone.
          map.addLayer({
            id: `${sourceId}-glow`,
            type: "line",
            source: sourceId,
            paint: { "line-color": SELECTION_HIGHLIGHT, "line-width": 9, "line-blur": 4, "line-opacity": 0 },
            layout: { visibility },
          });
          map.addLayer({
            id: `${sourceId}-outline`,
            type: "line",
            source: sourceId,
            paint: { "line-color": color, "line-width": 3 },
            layout: { visibility },
          });
          corridorLayerIdsRef.current[project.id] = [`${sourceId}-fill`, `${sourceId}-glow`, `${sourceId}-outline`];
          fillLayerIdsRef.current.push(`${sourceId}-fill`);
          layerToProjectIdRef.current[`${sourceId}-fill`] = project.id;
        }

        // Pass 2: route lines (top).
        for (const { project } of loaded) {
          if (project.geometryType !== "line") continue;
          const sourceId = `corridor-${project.id}`;
          const color = CATEGORY_COLORS[project.category];
          const visibility = modeRef.current !== "frequency" && visibleIds.has(project.id) ? "visible" : "none";

          map.addLayer({
            id: `${sourceId}-glow`,
            type: "line",
            source: sourceId,
            paint: { "line-color": SELECTION_HIGHLIGHT, "line-width": 20, "line-blur": 6, "line-opacity": 0 },
            layout: { visibility, "line-cap": "round", "line-join": "round" },
          });
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
          corridorLayerIdsRef.current[project.id] = [`${sourceId}-glow`, `${sourceId}-casing`, `${sourceId}-line`];
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
          // The surface hover handler owns the cursor in frequency mode.
          if (modeRef.current === "frequency") return;
          map.getCanvas().style.cursor = pickProjectAt(e.point) ? "pointer" : "";
        });
      });
    });

    // Keeps the canvas in step with later layout changes (sidebar reflow, the
    // 55%-height mobile breakpoint, window resizes). `redraw` alongside
    // `resize` mirrors what maplibre's own observer does, so a resize that
    // arrives while no render is scheduled still repaints.
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
      map.redraw();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFrequencyMode = mode === "frequency";

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const setVis = () => {
      // In frequency mode the cycle/bus context layers would just compete visually
      // with the travel-time surface, and the rail network is forced on so the
      // surface reads against the tracks it's actually describing.
      if (map.getLayer("cycle-network-line")) {
        map.setLayoutProperty(
          "cycle-network-line",
          "visibility",
          showCycleNetwork && !isFrequencyMode ? "visible" : "none",
        );
      }
      if (map.getLayer("bus-stops-point")) {
        map.setLayoutProperty(
          "bus-stops-point",
          "visibility",
          showBusStops && !isFrequencyMode ? "visible" : "none",
        );
      }
      if (map.getLayer("rail-network-line")) {
        map.setLayoutProperty(
          "rail-network-line",
          "visibility",
          isFrequencyMode || showRailNetwork ? "visible" : "none",
        );
      }
    };
    // `isStyleLoaded()` can go transiently false long after the initial load (e.g.
    // while background tiles stream in from panning), and "load" only ever fires
    // once — so gating entirely on it here would let a toggle silently do nothing.
    // Apply now (setVis itself no-ops on any layer that doesn't exist yet) and
    // additionally listen for "load" only as a bootstrap for the rare case where
    // this effect runs before the map's initial load has happened at all.
    setVis();
    if (!map.isStyleLoaded()) map.once("load", setVis);
  }, [showCycleNetwork, showBusStops, showRailNetwork, isFrequencyMode]);

  // Toggle corridor/boundary layer visibility to match the active category filters
  // (and hide every corridor entirely in frequency mode, where the surface takes over).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const visibleIds = new Set(projects.map((p) => p.id));
    Object.entries(corridorLayerIdsRef.current).forEach(([projectId, layerIds]) => {
      const visibility = !isFrequencyMode && visibleIds.has(projectId) ? "visible" : "none";
      layerIds.forEach((layerId) => {
        if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visibility);
      });
    });
  }, [projects, isFrequencyMode]);

  // Rail station points/labels and the travel-time surface only render in frequency mode.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const setVis = () => {
      const stationVisibility = isFrequencyMode ? "visible" : "none";
      if (map.getLayer("rail-stations-point")) {
        map.setLayoutProperty("rail-stations-point", "visibility", stationVisibility);
        map.setFilter("rail-stations-point", includePlanned ? null : ["!=", ["get", "planned"], true]);
      }
      if (map.getLayer("rail-stations-label")) {
        map.setLayoutProperty("rail-stations-label", "visibility", stationVisibility);
        map.setFilter("rail-stations-label", includePlanned ? null : ["!=", ["get", "planned"], true]);
      }
      const plannedTrackVisibility = isFrequencyMode && includePlanned ? "visible" : "none";
      for (const id of ["rail-planned-portishead-line", "rail-planned-henbury-line"]) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", plannedTrackVisibility);
      }
      if (map.getLayer("travel-surface-layer")) {
        map.setLayoutProperty(
          "travel-surface-layer",
          "visibility",
          isFrequencyMode && arrivals ? "visible" : "none",
        );
      }
      // The hover handler only clears the readout on the next mouse move, which would leave it
      // hanging over the projects map until the pointer happens to twitch.
      if (!isFrequencyMode) surfacePopupRef.current?.remove();
    };
    // `isStyleLoaded()` can go transiently false long after the initial load (e.g.
    // while background tiles stream in from panning), and "load" only ever fires
    // once — so gating entirely on it here would let a toggle silently do nothing.
    // Apply now (setVis itself no-ops on any layer that doesn't exist yet) and
    // additionally listen for "load" only as a bootstrap for the rare case where
    // this effect runs before the map's initial load has happened at all.
    setVis();
    if (!map.isStyleLoaded()) map.once("load", setVis);
  }, [isFrequencyMode, includePlanned, arrivals]);

  // Highlight the selected origin station with the same amber used for selected corridors.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("rail-stations-point")) return;
    map.setPaintProperty("rail-stations-point", "circle-radius", [
      "match",
      ["get", "id"],
      originId ?? "",
      7,
      4,
    ]);
    map.setPaintProperty("rail-stations-point", "circle-color", [
      "match",
      ["get", "id"],
      originId ?? "",
      SELECTION_HIGHLIGHT,
      "#2b2a27",
    ]);
    map.setPaintProperty("rail-stations-point", "circle-stroke-width", [
      "match",
      ["get", "id"],
      originId ?? "",
      3,
      2,
    ]);
  }, [originId]);

  // Redraw the travel-time surface whenever the origin or its options change, and refresh the
  // closure the map's moveend handler calls — the surface must also cover wherever the view pans
  // or zooms to next, not just where it was when `arrivals` last changed.
  useEffect(() => {
    redrawSurfaceRef.current = () => {
      const map = mapRef.current;
      const source = map?.getSource("travel-surface") as maplibregl.ImageSource | undefined;
      if (!map || !source) return;
      if (!arrivals) {
        surfaceRef.current = null;
        return;
      }
      const b = map.getBounds();
      const surface = renderSurface(arrivals, {
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
      surfaceRef.current = surface;
      source.updateImage({
        image: surface.image,
        coordinates: boundsToImageCoordinates(surface.bounds),
      });
    };
    redrawSurfaceRef.current();
  }, [arrivals]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    if (isFrequencyMode) return;

    projects.forEach((project) => {
      if (project.geometryUrl) return;

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
  }, [projects, onSelect, isFrequencyMode]);

  // Highlight the selected corridor/boundary, and fit the view to it (or fly to
  // the point marker for projects with no geometry).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.entries(corridorLayerIdsRef.current).forEach(([projectId, layerIds]) => {
      const selected = projectId === selectedId;
      layerIds.forEach((layerId) => {
        if (!map.getLayer(layerId)) return;
        if (layerId.endsWith("-glow")) {
          map.setPaintProperty(layerId, "line-opacity", selected ? 0.85 : 0);
        } else if (layerId.endsWith("-casing")) {
          map.setPaintProperty(layerId, "line-width", selected ? 14 : 10);
        } else if (layerId.endsWith("-line")) {
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

  return (
    <div className="map-view">
      <div ref={containerRef} className="map-canvas" />
      {isFrequencyMode && arrivals && <FrequencyLegend />}
    </div>
  );
}
