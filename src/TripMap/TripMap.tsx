import { MapStyle, Map as MapTilerMap, Marker, Popup } from '@maptiler/sdk';
import { useEffect, useMemo, useRef, useState } from 'react';
import s from './TripMap.module.css';

import '@maptiler/sdk/style.css';
import {
  ClockIcon,
  InfoCircledIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons';
import { Container, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { createPortal } from 'react-dom';
import { useCurrentTrip, useTripActivities } from '../Trip/hooks';
import type { TripSliceActivity } from '../Trip/store';
export function TripMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapTilerMap>(null);
  const trip = useCurrentTrip();
  const activities = useTripActivities(trip?.activityIds ?? []);

  const activitiesWithLocation = useMemo(
    () =>
      activities.filter(
        (activity) =>
          activity.locationLat != null && activity.locationLng != null,
      ),
    [activities],
  );

  const mapOptions = useMemo(() => {
    if (activitiesWithLocation.length === 0) {
      return undefined;
    }
    const latMin = Math.min(
      ...activitiesWithLocation.map((activity) => activity.locationLat!),
    );
    const latMax = Math.max(
      ...activitiesWithLocation.map((activity) => activity.locationLat!),
    );
    const lngMin = Math.min(
      ...activitiesWithLocation.map((activity) => activity.locationLng!),
    );
    const lngMax = Math.max(
      ...activitiesWithLocation.map((activity) => activity.locationLng!),
    );
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
    const zoom = Math.max(7, Math.min(15, Math.log2(360 / lngDiffBuffer) + 1));

    return {
      center: [lngCenter, latCenter] as [number, number],
      zoom,
    };
  }, [activitiesWithLocation]);

  const [popupPortals, setPopupPortals] = useState<
    { activity: TripSliceActivity; popup: HTMLDivElement }[]
  >([]);

  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new MapTilerMap({
      container: mapContainer.current,
      style: MapStyle.OPENSTREETMAP,
      zoom: mapOptions?.zoom,
      center: mapOptions ? mapOptions.center : undefined,
      apiKey: process.env.MAPTILER_API_KEY,
    });

    const newPopupPortals: typeof popupPortals = [];
    for (const activity of activitiesWithLocation) {
      if (!activity.locationLat || !activity.locationLng) continue;

      const popupContent = document.createElement('div');
      const popup = new Popup({
        closeButton: false,
        closeOnClick: true,
        offset: 25,
        className: s.popup,
      }).setDOMContent(popupContent);
      newPopupPortals.push({
        activity,
        popup: popupContent,
      });

      // Create and add marker with popup
      new Marker({
        color: 'var(--accent-indicator)',
        draggable: false,
      })
        .setLngLat([activity.locationLng, activity.locationLat])
        .setPopup(popup) // Attach the popup to the marker
        .addTo(map.current);
    }

    setPopupPortals(newPopupPortals);
  }, [activitiesWithLocation, mapOptions]);

  return (
    <div className={s.mapWrapper}>
      <div ref={mapContainer} className={s.map} />
      {popupPortals.map(({ activity, popup }) => {
        const activityStartStr = DateTime.fromMillis(activity.timestampStart)
          .setZone(trip?.timeZone)
          .toFormat('dd LLLL yyyy HH:mm');
        const activityEndStr = DateTime.fromMillis(activity.timestampEnd)
          .setZone(trip?.timeZone)
          // since 1 activity must be in same day, so might as well just show the time for end
          .toFormat('HH:mm');

        return createPortal(
          <Container>
            <Heading as="h3" size="2">
              {activity.title}
            </Heading>
            <Text as="p" size="1">
              <ClockIcon style={{ verticalAlign: '-2px' }} /> {activityStartStr}{' '}
              to {activityEndStr}
            </Text>
            {activity.location ? (
              <Text as="p" size="1">
                <SewingPinIcon style={{ verticalAlign: '-2px' }} />{' '}
                {activity.location}
              </Text>
            ) : null}
            {activity.description ? (
              <Text as="p" size="1" className={s.activityDescription}>
                <InfoCircledIcon style={{ verticalAlign: '-2px' }} />{' '}
                {activity.description}
              </Text>
            ) : null}
          </Container>,
          popup,
        );
      })}
    </div>
  );
}
