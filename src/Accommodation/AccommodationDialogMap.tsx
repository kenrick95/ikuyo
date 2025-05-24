import { Map as MapTilerMap, Marker } from '@maptiler/sdk';
import { useEffect, useRef } from 'react';
import s from '../Activity/ActivityDialogMap.module.css';
import { MapStyle } from '../maptiler/style';
import '@maptiler/sdk/style.css';
import { GeocodingControl } from '@maptiler/geocoding-control/maptilersdk';
import '@maptiler/geocoding-control/style.css';
import { ThemeAppearance } from '../theme/constants';
import { useTheme } from '../theme/hooks';

export function AccommodationMap({
  mapOptions,
  marker,
  setMarkerCoordinate,
  setMapZoom,
}: {
  mapOptions: { lng: number; lat: number; zoom?: number; region?: string };
  marker?: { lng: number; lat: number };
  setMarkerCoordinate?: (coordinate: { lng: number; lat: number }) => void;
  setMapZoom?: (zoom: number) => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapTilerMap>(null);
  const theme = useTheme();

  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new MapTilerMap({
      container: mapContainer.current,
      style:
        theme === ThemeAppearance.Dark
          ? MapStyle.OPENSTREETMAP_DARK
          : MapStyle.OPENSTREETMAP,
      center: [mapOptions.lng, mapOptions.lat],
      zoom: mapOptions.zoom,
      apiKey: process.env.MAPTILER_API_KEY,
    });

    map.current.on('zoomend', () => {
      if (!map.current) return;
      const zoom = map.current.getZoom();
      if (setMapZoom) {
        setMapZoom(zoom);
      }
    });

    let mapMarker: null | Marker = null;

    if (marker) {
      mapMarker = new Marker({
        color: 'var(--accent-indicator)',
        draggable: !!setMarkerCoordinate,
      });
      mapMarker
        .setLngLat([marker.lng, marker.lat])
        .addTo(map.current)
        .on('dragend', (event: { type: 'dragend'; target: Marker }) => {
          if (!map.current) return;
          const { lng, lat } = event.target.getLngLat();
          if (setMarkerCoordinate) {
            setMarkerCoordinate({ lng, lat });
          }
        });
    }

    if (marker && setMarkerCoordinate) {
      const gc = new GeocodingControl({
        limit: 5,
        country: mapOptions?.region?.toLowerCase(),
        proximity: [{ type: 'map-center' }],
        types: ['poi'],
        marker: false,
      });
      gc.on('pick', ({ feature }) => {
        if (!map.current) return;

        console.log('AccommodationDialogMap geocoding pick', feature);

        if (feature?.center) {
          const [lng, lat] = feature.center;
          mapMarker?.setLngLat([lng, lat]);
          setMarkerCoordinate({ lng, lat });
        }
      });
      map.current.addControl(gc);
    }
  }, [mapOptions, marker, setMarkerCoordinate, setMapZoom, theme]);
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

  return (
    <div className={s.mapWrapper}>
      <div ref={mapContainer} className={s.map} />
    </div>
  );
}
