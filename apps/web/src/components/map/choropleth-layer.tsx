"use client";

import { Source, Layer } from "react-map-gl/maplibre";
import { useCountryGeo } from "@/hooks/use-country-geo";
import {
  ADMIN1_VISIBLE_ZOOM,
  useAdmin1Geo,
} from "@/hooks/use-admin1-geo";
import { useChoropleth } from "@/hooks/use-choropleth";

interface Props {
  labelLayerId: string | undefined;
}

export function ChoroplethLayer({ labelLayerId }: Props) {
  const countryBoundaries = useCountryGeo();
  const admin1Boundaries = useAdmin1Geo();
  const {
    countryFillColor,
    countryLineColor,
    admin1FillColor,
    admin1LineColor,
  } = useChoropleth();

  return (
    <>
      {countryBoundaries && (
        <Source
          id="country-choropleth"
          type="geojson"
          data={countryBoundaries}
          tolerance={0.15}
        >
          <Layer
            id="country-fills"
            type="fill"
            beforeId={labelLayerId}
            maxzoom={5.5}
            paint={
              {
                "fill-color": countryFillColor,
                "fill-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  1, 1,
                  4, 1,
                  5.5, 0,
                ],
              } as never
            }
          />
          <Layer
            id="country-borders"
            type="line"
            beforeId={labelLayerId}
            maxzoom={5.5}
            paint={
              {
                "line-color": countryLineColor,
                "line-width": 1,
                "line-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  1, 0.4,
                  4, 0.4,
                  5.5, 0,
                ],
              } as never
            }
          />
        </Source>
      )}

      {admin1Boundaries && (
        <Source
          id="admin1-choropleth"
          type="geojson"
          data={admin1Boundaries}
          tolerance={0}
        >
          <Layer
            id="admin1-fills"
            type="fill"
            beforeId={labelLayerId}
            minzoom={ADMIN1_VISIBLE_ZOOM}
            paint={
              {
                "fill-color": admin1FillColor,
                "fill-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  4, 0,
                  5.5, 1,
                  10, 1,
                ],
              } as never
            }
          />
          <Layer
            id="admin1-borders"
            type="line"
            beforeId={labelLayerId}
            minzoom={ADMIN1_VISIBLE_ZOOM}
            paint={
              {
                "line-color": admin1LineColor,
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  4, 0.3,
                  8, 1,
                ],
                "line-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  4, 0,
                  5.5, 0.5,
                ],
              } as never
            }
          />
        </Source>
      )}
    </>
  );
}
