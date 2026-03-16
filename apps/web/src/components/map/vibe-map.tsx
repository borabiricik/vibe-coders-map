"use client";

import { useCallback, useRef, useState } from "react";
import Map, { type MapRef } from "react-map-gl/maplibre";
import { useMapStore } from "@/hooks/use-map-viewport";
import { ChoroplethLayer } from "./choropleth-layer";

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const MAP_MAX_ZOOM = 6.5;

export function VibeMap() {
  const mapRef = useRef<MapRef>(null);
  const setViewport = useMapStore((s) => s.setViewport);
  const setBounds = useMapStore((s) => s.setBounds);
  const [labelLayerId, setLabelLayerId] = useState<string | undefined>();

  const updateBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    setBounds({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }, [setBounds]);

  const onMove = useCallback(
    (evt: {
      viewState: { zoom: number; latitude: number; longitude: number };
    }) => {
      setViewport(
        evt.viewState.zoom,
        evt.viewState.latitude,
        evt.viewState.longitude,
      );
      updateBounds();
    },
    [setViewport, updateBounds],
  );

  const onLoad = useCallback(() => {
    updateBounds();
    const map = mapRef.current;
    if (!map) return;
    const layers = map.getStyle().layers;
    const firstSymbol = layers.find(
      (l: { type: string }) => l.type === "symbol",
    );
    if (firstSymbol) {
      setLabelLayerId(firstSymbol.id);
    }
  }, [updateBounds]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 10, latitude: 30, zoom: 2 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAP_STYLE}
      onMove={onMove}
      onLoad={onLoad}
      maxZoom={MAP_MAX_ZOOM}
      minZoom={1}
    >
      <ChoroplethLayer labelLayerId={labelLayerId} />
    </Map>
  );
}
