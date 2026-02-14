import {
  type GeocodingOptions,
  type GeoJSONSource,
  geocoding,
  type MapOptions,
  Map as MapTilerMap,
  Marker,
  config as mapTilerConfig,
} from '@maptiler/sdk';

mapTilerConfig.session = false;

import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculateZoomFromFeature } from '../common/geocodingUtils';
import { MapStyle } from '../theme/maptiler';
import s from './TripMap.module.css';

import '@maptiler/sdk/style.css';
import { Spinner } from '@radix-ui/themes';
import { createPortal } from 'react-dom';
import { getRegionDisplayName } from '../data/intl/regions';
import { getTripStatus } from '../Trip/getTripStatus';
import {
  useCurrentTrip,
  useTripAccommodations,
  useTripActivities,
} from '../Trip/store/hooks';
import type {
  TripSliceAccommodation,
  TripSliceActivity,
  TripSliceTrip,
} from '../Trip/store/types';
import { ThemeAppearance } from '../theme/constants';
import { useTheme } from '../theme/hooks';
import { LocationType, type MarkerLocation } from './constants';
import { createGeoJsonData } from './geometry';
import { createMarkerElement } from './marker';
import { AccommodationPopup } from './popups/AccommodationPopup';
import { ActivityPopup } from './popups/ActivityPopup';
import { createPopup } from './popups/createPopup';

const routeLineLayerId = 'Route Line' as const;
const routeArrowLayerId = 'Route Line Arrow' as const;
const routeSourceId = 'route' as const;

type PopupPortal =
  | {
      type:
        | typeof LocationType.Activity
        | typeof LocationType.ActivityDestination;
      activityId: string;
      popup: HTMLDivElement;
    }
  | {
      type: typeof LocationType.Accommodation;
      accommodationId: string;
      popup: HTMLDivElement;
    };

function isActivityToday(
  activity: TripSliceActivity,
  trip: TripSliceTrip | null | undefined,
): boolean {
  if (!trip || !activity.timestampStart || !activity.timestampEnd) return false;

  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart).setZone(
    trip.timeZone,
  );
  const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd).setZone(
    trip.timeZone,
  );
  const tripStatus = getTripStatus(tripStartDateTime, tripEndDateTime);

  // Only highlight for ongoing trips
  if (tripStatus?.status !== 'current') return false;

  const now = DateTime.now().setZone(trip.timeZone);
  const todayStart = now.startOf('day');
  const todayEnd = now.endOf('day');

  const activityStart = DateTime.fromMillis(activity.timestampStart).setZone(
    trip.timeZone,
  );
  return activityStart >= todayStart && activityStart <= todayEnd;
}

function isAccommodationToday(
  accommodation: TripSliceAccommodation,
  trip: TripSliceTrip | null | undefined,
): boolean {
  if (!trip) return false;

  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart).setZone(
    trip.timeZone,
  );
  const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd).setZone(
    trip.timeZone,
  );
  const tripStatus = getTripStatus(tripStartDateTime, tripEndDateTime);

  // Only highlight for ongoing trips
  if (tripStatus?.status !== 'current') return false;

  const now = DateTime.now().setZone(trip.timeZone);
  const todayStart = now.startOf('day');
  const todayEnd = now.endOf('day');

  const checkInDateTime = DateTime.fromMillis(
    accommodation.timestampCheckIn,
  ).setZone(trip.timeZone);
  const checkOutDateTime = DateTime.fromMillis(
    accommodation.timestampCheckOut,
  ).setZone(trip.timeZone);

  // Check if today is during the stay (check-in is today or before, check-out is after today)
  // or if check-in/check-out happens today
  return (
    (checkInDateTime >= todayStart && checkInDateTime <= todayEnd) || // Checking in today
    (checkOutDateTime >= todayStart && checkOutDateTime <= todayEnd) || // Checking out today
    (checkInDateTime <= todayStart && checkOutDateTime >= todayEnd) // Staying through today
  );
}

export function TripMap({ useCase }: { useCase: 'map' | 'home' | 'list' }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapTilerMap>(null);
  const { trip, loading: currentTripLoading } = useCurrentTrip();
  const activities = useTripActivities(trip?.activityIds ?? []);
  const accommodations = useTripAccommodations(trip?.accommodationIds ?? []);
  const mapMarkers = useRef<{
    [key: string]: Marker;
  }>({});
  const [popupPortals, setPopupPortals] = useState<{
    [key: string]: PopupPortal;
  }>({});

  const accommodationsWithLocation = useMemo(
    () =>
      accommodations.filter(
        (accommodation) =>
          accommodation.locationLat != null &&
          accommodation.locationLng != null,
      ),
    [accommodations],
  );
  const allLocations = useMemo(() => {
    const locations: MarkerLocation[] = [];
    for (const activity of activities) {
      if (activity.locationLat != null && activity.locationLng != null) {
        locations.push({
          type: LocationType.Activity,
          id: activity.id,
          lat: activity.locationLat,
          lng: activity.locationLng,
          isToday: isActivityToday(activity, trip),
          customIcon: activity.icon ?? null,
        });
      }
      if (
        activity.locationDestinationLat != null &&
        activity.locationDestinationLng != null
      ) {
        locations.push({
          type: LocationType.ActivityDestination,
          id: activity.id,
          lat: activity.locationDestinationLat,
          lng: activity.locationDestinationLng,
          isToday: isActivityToday(activity, trip),
          customIcon: null,
        });
      }
    }
    for (const accommodation of accommodationsWithLocation) {
      if (
        accommodation.locationLat != null &&
        accommodation.locationLng != null
      ) {
        locations.push({
          type: LocationType.Accommodation,
          id: accommodation.id,
          lat: accommodation.locationLat,
          lng: accommodation.locationLng,
          isToday: isAccommodationToday(accommodation, trip),
          customIcon: null,
        });
      }
    }
    return locations;
  }, [activities, accommodationsWithLocation, trip]);
  const allLines = useMemo(() => {
    const lines: {
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
    }[] = [];
    for (const activity of activities) {
      if (
        activity.locationLat != null &&
        activity.locationLng != null &&
        activity.locationDestinationLat != null &&
        activity.locationDestinationLng != null
      ) {
        lines.push({
          from: {
            lat: activity.locationLat,
            lng: activity.locationLng,
          },
          to: {
            lat: activity.locationDestinationLat,
            lng: activity.locationDestinationLng,
          },
        });
      }
    }
    return lines;
  }, [activities]);

  const mapOptions = useMemo(() => {
    if (allLocations.length === 0) {
      return undefined;
    }

    const latMin = Math.min(...allLocations.map((point) => point.lat));
    const latMax = Math.max(...allLocations.map((point) => point.lat));
    const lngMin = Math.min(...allLocations.map((point) => point.lng));
    const lngMax = Math.max(...allLocations.map((point) => point.lng));
    const latDiff = latMax - latMin;
    const lngDiff = lngMax - lngMin;
    const latBuffer = latDiff * 0.1;
    const lngBuffer = lngDiff * 0.1;
    const latMinBuffer = latMin - latBuffer;
    const latMaxBuffer = latMax + latBuffer;
    const lngMinBuffer = lngMin - lngBuffer;
    const lngMaxBuffer = lngMax + lngBuffer;
    const latDiffBuffer = latMaxBuffer - latMinBuffer;
    const lngDiffBuffer = lngMaxBuffer - lngMinBuffer;
    const latCenter = latMinBuffer + latDiffBuffer / 2;
    const lngCenter = lngMinBuffer + lngDiffBuffer / 2;

    return {
      center: [lngCenter, latCenter] as [number, number],
      bounds: [
        [lngMinBuffer, latMinBuffer],
        [lngMaxBuffer, latMaxBuffer],
      ] as [[number, number], [number, number]],
    };
  }, [allLocations]);

  // Function to get region center coordinates via geocoding
  const getRegionCenter = useCallback(
    async (regionCode: string): Promise<[number, number, number] | null> => {
      try {
        const region = getRegionDisplayName(regionCode);
        const geocodingOptions: GeocodingOptions = {
          language: 'en',
          limit: 1,
          types: ['country'],
          apiKey: process.env.MAPTILER_API_KEY,
        };

        const res = await geocoding.forward(region, geocodingOptions);
        const feature = res?.features[0];

        if (feature) {
          const [lng, lat] = feature.center ?? [];
          if (lng !== undefined && lat !== undefined) {
            const zoom = calculateZoomFromFeature(feature);
            return [lng, lat, zoom];
          }
        }
      } catch (e) {
        console.error('Failed to get region center:', e);
      }
      return null;
    },
    [],
  );

  const theme = useTheme();

  // biome-ignore lint/correctness/useExhaustiveDependencies: This hook should only run once during the component mount and unmount! so we don't get flashes of map initialization
  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;
    if (currentTripLoading) return;
    console.log('TripMap init', { mapOptions });

    const initializeMap = async () => {
      if (!mapContainer.current) {
        return;
      }
      const mapConfig: MapOptions = {
        container: mapContainer.current,
        style:
          theme === ThemeAppearance.Dark
            ? MapStyle.OPENSTREETMAP_DARK
            : MapStyle.OPENSTREETMAP,
        bounds: mapOptions ? mapOptions.bounds : undefined,
        center: mapOptions ? mapOptions.center : undefined,
        fitBoundsOptions: {
          padding: 20,
        },
        apiKey: process.env.MAPTILER_API_KEY,
        logoPosition: 'bottom-right',
        terrainControl: false,
        fullscreenControl: true,
        geolocateControl: useCase === 'map',
      };

      // If no locations are available but trip has a region, center on region
      if (!mapOptions && trip?.region && allLocations.length === 0) {
        const regionResult = await getRegionCenter(trip.region);
        if (regionResult) {
          const [lng, lat, zoom] = regionResult;
          mapConfig.center = [lng, lat];
          mapConfig.zoom = zoom; // Use calculated zoom level from geocoding
        }
      }

      try {
        map.current = new MapTilerMap(mapConfig);
      } catch (e) {
        console.error('MapTiler Map initialization failed:', e);
        return;
      }

      // Add line layer to connect origin and destination
      const addLineLayer = () => {
        if (!map.current || !allLines.length) return;

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
          data: createGeoJsonData(allLines),
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
      map.current.on('load', addLineLayer);
      // If map is already loaded, add immediately
      if (map.current.isStyleLoaded()) {
        addLineLayer();
      }

      const newPopupPortals: Record<string, PopupPortal> = {};
      for (const location of allLocations) {
        const [popup, popupPortal] = createPopup(location, s.popup);

        const markerElement = createMarkerElement(location);
        const markerKey = `${location.type}-${location.id}`;
        newPopupPortals[markerKey] = popupPortal;

        mapMarkers.current[markerKey] = new Marker({
          element: markerElement,
          draggable: false,
        })
          .setLngLat([location.lng, location.lat])
          .setPopup(popup) // Attach the popup to the marker
          .addTo(map.current);
      }

      setPopupPortals(newPopupPortals);
    };

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [
    currentTripLoading,
    theme,
    trip,
    allLocations,
    mapOptions,
    allLines,
    getRegionCenter,
  ]);
  useEffect(() => {
    if (!map.current) return;
    if (theme === ThemeAppearance.Dark) {
      map.current.setStyle(MapStyle.OPENSTREETMAP_DARK);
    } else if (theme === ThemeAppearance.Light) {
      map.current.setStyle(MapStyle.OPENSTREETMAP);
    }
  }, [theme]);

  // If locations change, update markers
  useEffect(() => {
    if (!map.current) return;
    if (!allLocations.length) return;
    console.log('TripMap update locations', { allLocations });
    const allKeys = new Set(Object.keys(mapMarkers.current));
    const newPopupPortals: Record<string, PopupPortal> = popupPortals;
    for (const location of allLocations) {
      const markerKey = `${location.type}-${location.id}`;
      allKeys.delete(markerKey);
      if (mapMarkers.current[markerKey]) {
        mapMarkers.current[markerKey].setLngLat([location.lng, location.lat]);
      } else {
        // New marker & portal
        const [popup, popupPortal] = createPopup(location, s.popup);
        const markerElement = createMarkerElement(location);
        newPopupPortals[markerKey] = popupPortal;
        mapMarkers.current[markerKey] = new Marker({
          element: markerElement,
          draggable: false,
        })
          .setLngLat([location.lng, location.lat])
          .setPopup(popup)
          .addTo(map.current);
      }
    }
    // Remove markers that are no longer in the locations
    for (const key of allKeys) {
      if (mapMarkers.current[key]) {
        mapMarkers.current[key].remove();
        delete mapMarkers.current[key];
      }
      delete newPopupPortals[key];
    }
  }, [allLocations, popupPortals]);

  // If lines change, update the line layer
  useEffect(() => {
    if (!map.current) return;
    if (!allLines.length) return;
    console.log('TripMap update lines', { allLines });

    const mapSource = map.current.getSource<GeoJSONSource>(routeSourceId);
    if (mapSource) {
      mapSource.setData(createGeoJsonData(allLines));
      return;
    }
  }, [allLines]);

  return (
    <div className={s.mapWrapper}>
      {currentTripLoading ? <Spinner size="3" m="3" /> : null}
      <div ref={mapContainer} className={s.map} />
      {Object.values(popupPortals).map((popupPortal) => {
        switch (popupPortal.type) {
          case LocationType.Accommodation:
            return createPortal(
              <AccommodationPopup
                key={popupPortal.accommodationId}
                accommodationId={popupPortal.accommodationId}
                className={s.description}
                linkTargetBasePage={
                  useCase === 'list' || useCase === 'map' ? 'list' : 'timetable'
                }
              />,
              popupPortal.popup,
            );
          case LocationType.Activity:
          case LocationType.ActivityDestination:
            return createPortal(
              <ActivityPopup
                key={popupPortal.activityId}
                activityId={popupPortal.activityId}
                type={popupPortal.type}
                className={s.description}
                linkTargetBasePage={
                  useCase === 'list' || useCase === 'map' ? 'list' : 'timetable'
                }
              />,
              popupPortal.popup,
            );
        }
        return null;
      })}
    </div>
  );
}
