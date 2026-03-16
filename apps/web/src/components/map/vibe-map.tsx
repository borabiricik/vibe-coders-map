"use client";

import { useCallback, useRef, useState } from "react";
import Map, { Marker, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import { useMapStore } from "@/hooks/use-map-viewport";
import { ChoroplethLayer } from "./choropleth-layer";
import { RegionPopup } from "./region-popup";

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const MAP_MAX_ZOOM = 6.5;
const INTERACTIVE_LAYERS = ["country-fills", "admin1-fills"];

export interface PopupInfo {
  longitude: number;
  latitude: number;
  type: "country" | "region";
  code: string;
  name: string;
}

export function VibeMap() {
  const mapRef = useRef<MapRef>(null);
  const setViewport = useMapStore((s) => s.setViewport);
  const setBounds = useMapStore((s) => s.setBounds);
  const [labelLayerId, setLabelLayerId] = useState<string | undefined>();
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);

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

  const onClick = useCallback((evt: MapLayerMouseEvent) => {
    const feature = evt.features?.[0];
    if (!feature) {
      setPopupInfo(null);
      return;
    }

    const props = feature.properties;
    const layerId = feature.layer?.id;

    if (layerId === "country-fills") {
      const code = props?.ISO_A2_EH || props?.ISO_A2;
      const name = props?.NAME || props?.ADMIN || code;
      if (code) {
        setPopupInfo({
          longitude: evt.lngLat.lng,
          latitude: evt.lngLat.lat,
          type: "country",
          code,
          name,
        });
      }
    } else if (layerId === "admin1-fills") {
      const code = props?.iso_3166_2;
      const name = props?.name || code;
      if (code) {
        setPopupInfo({
          longitude: evt.lngLat.lng,
          latitude: evt.lngLat.lat,
          type: "region",
          code,
          name,
        });
      }
    }
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 10, latitude: 30, zoom: 2 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAP_STYLE}
      onMove={onMove}
      onLoad={onLoad}
      onClick={onClick}
      interactiveLayerIds={INTERACTIVE_LAYERS}
      maxZoom={MAP_MAX_ZOOM}
      minZoom={1}
      renderWorldCopies={false}
      cursor={popupInfo ? "pointer" : "grab"}
    >
      <ChoroplethLayer labelLayerId={labelLayerId} />
      {popupInfo && (
        <Marker
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          anchor="bottom"
        >
          <RegionPopup
            type={popupInfo.type}
            code={popupInfo.code}
            name={popupInfo.name}
            onClose={() => setPopupInfo(null)}
          />
        </Marker>
      )}
    </Map>
  );
}
