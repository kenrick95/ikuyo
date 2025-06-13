import {
  type GeoJSONSource,
  Map as MapTilerMap,
  Marker,
  config as mapTilerConfig,
} from '@maptiler/sdk';

mapTilerConfig.session = false;

import { useEffect, useRef, useState } from 'react';
import { MapStyle } from '../maptiler/style';
import s from './ActivityDialogMap.module.css';
import '@maptiler/sdk/style.css';
import { GeocodingControl } from '@maptiler/geocoding-control/maptilersdk';
import '@maptiler/geocoding-control/style.css';
import { ThemeAppearance } from '../theme/constants';
import { useTheme } from '../theme/hooks';

const routeLineLayerId = 'Route Line' as const;
const routeArrowLayerId = 'Route Line Arrow' as const;
const routeSourceId = 'route' as const;

export function ActivityMap({
  mapOptions,
  marker,
  markerDestination,
  setMarkerCoordinate,
  setMapZoom,
}: {
  mapOptions: { lng: number; lat: number; zoom?: number; region?: string };
  marker?: { lng: number; lat: number };
  markerDestination?: { lng: number; lat: number };
  setMarkerCoordinate?: (coordinate: { lng: number; lat: number }) => void;
  setMapZoom?: (zoom: number) => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapTilerMap>(null);
  const theme = useTheme();
  const mapMarker = useRef<Marker | null>(null);
  const mapMarkerDestination = useRef<Marker | null>(null);
  const [initialValues] = useState({
    mapOptions,
    marker,
    markerDestination,
  });

  useEffect(() => {
    // This hook should only run once during the component mount and unmount!
    if (map.current) return;
    if (!mapContainer.current) return;

    const bounds =
      initialValues.marker && initialValues.markerDestination
        ? ([
            Math.min(
              initialValues.marker.lng,
              initialValues.markerDestination.lng,
            ), // west
            Math.min(
              initialValues.marker.lat,
              initialValues.markerDestination.lat,
            ), // south
            Math.max(
              initialValues.marker.lng,
              initialValues.markerDestination.lng,
            ), // east
            Math.max(
              initialValues.marker.lat,
              initialValues.markerDestination.lat,
            ), // north
          ] as [number, number, number, number])
        : undefined;

    try {
      map.current = new MapTilerMap({
        container: mapContainer.current,
        style:
          theme === ThemeAppearance.Dark
            ? MapStyle.OPENSTREETMAP_DARK
            : MapStyle.OPENSTREETMAP,
        center: [initialValues.mapOptions.lng, initialValues.mapOptions.lat],
        zoom: initialValues.mapOptions.zoom,
        bounds,
        fitBoundsOptions: {
          padding: 50,
        },
        apiKey: process.env.MAPTILER_API_KEY,
        logoPosition: 'bottom-right',
        terrainControl: false,
        geolocateControl: false,
      });
    } catch (e) {
      console.error('Error initializing MapTilerMap:', e);
      return;
    }

    map.current.on('zoomend', () => {
      if (!map.current) return;
      const zoom = map.current.getZoom();
      console.log('ActivityDialogMap zoomend', zoom);
      if (setMapZoom) {
        setMapZoom(zoom);
      }
    });

    // Add line layer to connect origin and destination
    const addLineLayer = () => {
      if (
        !map.current ||
        !initialValues.marker ||
        !initialValues.markerDestination
      )
        return;

      // Remove existing line soruce & layer if it exists
      if (map.current.getLayer(routeLineLayerId)) {
        map.current.removeLayer(routeLineLayerId);
      }
      if (map.current.getSource(routeSourceId)) {
        map.current.removeSource(routeSourceId);
      }
      // Add source and layer
      map.current.addSource(routeSourceId, {
        type: 'geojson',
        data: createLineGeoJSON(
          initialValues.marker,
          initialValues.markerDestination,
        ),
      });

      map.current.addLayer({
        id: routeLineLayerId,
        type: 'line',
        source: routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': 'hsla(0, 100%, 60%, 0.9)',
          'line-width': 2,
          'line-dasharray': [2, 4],
        },
      });

      // Add arrow head at the destination
      map.current.addLayer({
        id: routeArrowLayerId,
        type: 'symbol',
        source: routeSourceId,
        layout: {
          'symbol-placement': 'line-center',
          'symbol-avoid-edges': true,
          'text-field': '▶',
          'text-size': 16,
          'text-rotate': 0,
          'text-allow-overlap': true,
          'text-keep-upright': false,
          'text-pitch-alignment': 'map',
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': 'hsla(0, 100%, 60%, 0.9)',
        },
      });
    };

    // Add the line layer after map is loaded
    if (initialValues.marker && initialValues.markerDestination) {
      map.current.on('load', addLineLayer);
      // If map is already loaded, add immediately
      if (map.current.isStyleLoaded()) {
        addLineLayer();
      }
    }

    if (initialValues.marker) {
      mapMarker.current = new Marker({
        color: 'var(--accent-indicator)',
        draggable: !!setMarkerCoordinate,
      });
      mapMarker.current
        .setLngLat([initialValues.marker.lng, initialValues.marker.lat])
        .addTo(map.current)
        .on('dragend', (event: { type: 'dragend'; target: Marker }) => {
          if (!map.current) return;
          const { lng, lat } = event.target.getLngLat();
          console.log('ActivityDialogMap dragend', { lng, lat });
          if (setMarkerCoordinate) {
            setMarkerCoordinate({ lng, lat });
          }
        });
    }

    if (initialValues.markerDestination) {
      mapMarkerDestination.current = new Marker({
        color: 'var(--accent-indicator)',
      });
      mapMarkerDestination.current
        .setLngLat([
          initialValues.markerDestination.lng,
          initialValues.markerDestination.lat,
        ])
        .addTo(map.current);
    }

    if (setMarkerCoordinate) {
      const gc = new GeocodingControl({
        limit: 5,
        country: initialValues.mapOptions?.region?.toLowerCase(),
        proximity: [{ type: 'map-center' }],
        types: ['poi', 'major_landform', 'address'],
        marker: false,
      });
      gc.on('pick', ({ feature }) => {
        if (!map.current) return;
        console.log('ActivityDialogMap geocoding pick', feature);
        if (feature?.center) {
          const [lng, lat] = feature.center;
          mapMarker.current?.setLngLat([lng, lat]);
          setMarkerCoordinate({ lng, lat });
        }
      });
      map.current.addControl(gc);
    }

    return () => {
      if (map.current) {
        if (map.current.getLayer(routeArrowLayerId)) {
          map.current.removeLayer(routeArrowLayerId);
        }
        if (map.current.getLayer(routeLineLayerId)) {
          map.current.removeLayer(routeLineLayerId);
        }
        if (map.current.getSource(routeSourceId)) {
          map.current.removeSource(routeSourceId);
        }
        map.current.remove();
        map.current = null;
      }
      if (mapMarker.current) {
        mapMarker.current.remove();
      }
      if (mapMarkerDestination.current) {
        mapMarkerDestination.current.remove();
      }
    };
  }, [setMapZoom, setMarkerCoordinate, theme, initialValues]);

  useEffect(() => {
    if (!map.current) return;
    if (theme === ThemeAppearance.Dark) {
      map.current.setStyle(MapStyle.OPENSTREETMAP_DARK);
    } else if (theme === ThemeAppearance.Light) {
      map.current.setStyle(MapStyle.OPENSTREETMAP);
    }
  }, [theme]);

  useEffect(() => {
    if (!map.current) return;
    if (mapOptions.zoom == null) return;
    map.current.setZoom(mapOptions.zoom);
  }, [mapOptions.zoom]);

  useEffect(() => {
    if (!map.current || !mapMarker.current) return;
    if (marker?.lat == null || marker?.lng == null) return;
    mapMarker.current.setLngLat([marker.lng, marker.lat]);
  }, [marker?.lat, marker?.lng]);

  useEffect(() => {
    if (!map.current || !mapMarkerDestination.current) return;
    if (markerDestination?.lat == null || markerDestination?.lng == null)
      return;
    mapMarkerDestination.current.setLngLat([
      markerDestination.lng,
      markerDestination.lat,
    ]);
  }, [markerDestination?.lat, markerDestination?.lng]);

  useEffect(() => {
    if (!map.current || !mapMarker.current || !mapMarkerDestination.current)
      return;
    if (marker?.lat == null || marker?.lng == null) return;
    if (markerDestination?.lat == null || markerDestination?.lng == null)
      return;

    const mapSource = map.current.getSource<GeoJSONSource>(routeSourceId);
    if (mapSource) {
      mapSource.setData(
        createLineGeoJSON(
          { lng: marker.lng, lat: marker.lat },
          {
            lng: markerDestination?.lng ?? marker.lng,
            lat: markerDestination?.lat ?? marker.lat,
          },
        ),
      );
    }
  }, [
    marker?.lat,
    marker?.lng,
    markerDestination?.lat,
    markerDestination?.lng,
  ]);

  return (
    <div className={s.mapWrapper}>
      <div ref={mapContainer} className={s.map} />
    </div>
  );
}

function createLineGeoJSON(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ] as [number, number][],
    },
  };
}
