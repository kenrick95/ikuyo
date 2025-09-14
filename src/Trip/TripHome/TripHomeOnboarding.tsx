import { Button, Flex } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { AccommodationNewDialog } from '../../Accommodation/AccommodationNewDialog';
import { ActivityNewDialog } from '../../Activity/ActivityNewDialog';
import { useBoundStore } from '../../data/store';
import { MacroplanNewDialog } from '../../Macroplan/MacroplanNewDialog';
import { RouteTripTimetableView } from '../../Routes/routes';
import { TripUserRole } from '../../User/TripUserRole';
import {
  useCurrentTrip,
  useTripAccommodations,
  useTripActivities,
  useTripMacroplans,
} from '../store/hooks';

export function TripHomeOnboarding() {
  const { trip } = useCurrentTrip();
  const activities = useTripActivities(trip?.activityIds ?? []);
  const macroplans = useTripMacroplans(trip?.macroplanIds ?? []);
  const accommodations = useTripAccommodations(trip?.accommodationIds ?? []);

  // Determine if trip is {current, or past}
  const isTripCurrentOrPast = useMemo(() => {
    if (!trip) return false;
    const now = DateTime.now().setZone(trip.timeZone);
    const tripStart = DateTime.fromMillis(trip.timestampStart).setZone(
      trip.timeZone,
    );
    return now >= tripStart;
  }, [trip]);

  const userCanModifyTrip = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);

  const pushDialog = useBoundStore((state) => state.pushDialog);
  const [, setLocation] = useLocation();
  const openActivityNewDialog = useCallback(() => {
    if (!trip) return;
    setLocation(RouteTripTimetableView.asRouteTarget());
    pushDialog(ActivityNewDialog, { trip });
  }, [pushDialog, trip, setLocation]);
  const openAccommodationNewDialog = useCallback(() => {
    if (!trip) return;
    setLocation(RouteTripTimetableView.asRouteTarget());
    pushDialog(AccommodationNewDialog, { trip });
  }, [pushDialog, trip, setLocation]);
  const openMacroplanNewDialog = useCallback(() => {
    if (!trip) return;
    setLocation(RouteTripTimetableView.asRouteTarget());
    pushDialog(MacroplanNewDialog, { trip });
  }, [pushDialog, trip, setLocation]);

  if (
    !trip ||
    // Don't show onboarding if trip is current or past
    isTripCurrentOrPast ||
    // or if user cannot modify trip
    !userCanModifyTrip ||
    // or if user has already added at least one of each item
    (activities.length > 0 &&
      macroplans.length > 0 &&
      accommodations.length > 0)
  ) {
    return null;
  }
  return (
    <Flex align="center" mt="4" gap="2">
      {activities.length === 0 ? (
        <Button size="2" variant="outline" onClick={openActivityNewDialog}>
          Add first activity
        </Button>
      ) : null}
      {macroplans.length === 0 ? (
        <Button size="2" variant="outline" onClick={openMacroplanNewDialog}>
          Add first day plan
        </Button>
      ) : null}
      {accommodations.length === 0 ? (
        <Button size="2" variant="outline" onClick={openAccommodationNewDialog}>
          Add first accommodation
        </Button>
      ) : null}
    </Flex>
  );
}
