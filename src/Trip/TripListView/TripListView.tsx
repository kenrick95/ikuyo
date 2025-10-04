import { ContextMenu, Flex, Heading } from '@radix-ui/themes';
import clsx from 'clsx';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Route, Switch } from 'wouter';
import { Accommodation } from '../../Accommodation/Accommodation';
import { AccommodationDialog } from '../../Accommodation/AccommodationDialog/AccommodationDialog';
import { AccommodationNewDialog } from '../../Accommodation/AccommodationNewDialog';
import { Activity } from '../../Activity/Activity';
import { ActivityDialog } from '../../Activity/ActivityDialog/ActivityDialog';
import { ActivityIdea } from '../../Activity/ActivityIdea/ActivityIdea';
import { ActivityNewDialog } from '../../Activity/ActivityNewDialog';
import {
  type DayGroups,
  groupActivitiesByDays,
} from '../../Activity/eventGrouping';
import { useBoundStore } from '../../data/store';
import { Macroplan } from '../../Macroplan/Macroplan';
import { MacroplanDialog } from '../../Macroplan/MacroplanDialog/MacroplanDialog';
import { MacroplanNewDialog } from '../../Macroplan/MacroplanNewDialog';
import { TripMap } from '../../Map/TripMap';
import {
  RouteTripListViewAccommodation,
  RouteTripListViewActivity,
  RouteTripListViewMacroplan,
} from '../../Routes/routes';
import { TripUserRole } from '../../User/TripUserRole';
import {
  useCurrentTrip,
  useTripAccommodations,
  useTripActivities,
  useTripMacroplans,
} from '../store/hooks';
import { TripViewMode } from '../TripViewMode';
import s from './TripListView.module.css';

export function TripListView() {
  const { trip } = useCurrentTrip();
  const activities = useTripActivities(trip?.activityIds ?? []);
  const tripAccommodations = useTripAccommodations(
    trip?.accommodationIds ?? [],
  );
  const tripMacroplans = useTripMacroplans(trip?.macroplanIds ?? []);
  const userCanEditOrDelete = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);

  // Ref for the list container to enable scrolling
  const listContainerRef = useRef<HTMLDivElement>(null);

  // State to track if we've already scrolled for this trip to prevent repeated scrolling
  const [hasScrolledForTrip, setHasScrolledForTrip] = useState<string | null>(
    null,
  );

  const dayGroups = useMemo(() => {
    if (!trip || !activities || !tripAccommodations || !tripMacroplans)
      return {
        inTrip: [],
        outTrip: { accommodations: [], activities: [], macroplans: [] },
      } satisfies DayGroups;
    return groupActivitiesByDays({
      trip,
      activities,
      accommodations: tripAccommodations,
      macroplans: tripMacroplans,
    });
  }, [trip, activities, tripAccommodations, tripMacroplans]);

  /** Current day number (1-based) */
  const currentDayIndex = useMemo(() => {
    if (!trip?.timeZone || !trip?.timestampStart || !trip?.timestampEnd) {
      return null;
    }

    const tripStartDateTime = DateTime.fromMillis(trip.timestampStart).setZone(
      trip.timeZone,
    );
    const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd).setZone(
      trip.timeZone,
    );
    const now = DateTime.now().setZone(trip.timeZone);

    if (now < tripStartDateTime || now > tripEndDateTime) {
      return null;
    }

    const currentDay =
      Math.floor(now.diff(tripStartDateTime.startOf('day'), 'days').days) + 1;

    // Ensure the current day is within the valid range (1-based index)
    const clampedDay = Math.max(
      1,
      Math.min(currentDay, dayGroups.inTrip.length),
    );

    return clampedDay;
  }, [trip, dayGroups.inTrip.length]);

  // Auto-scroll to current day section when trip is in progress
  useEffect(() => {
    if (
      currentDayIndex == null ||
      trip?.id == null ||
      !listContainerRef.current
    ) {
      return;
    }
    // Check if we've already scrolled for this trip
    if (hasScrolledForTrip === trip.id) {
      return;
    }

    // Delay scroll to ensure elements are rendered
    const scrollToCurrentDay = () => {
      if (!listContainerRef.current) return;

      // Find the heading for the current day
      const currentDayGroup = dayGroups.inTrip[currentDayIndex - 1];
      if (!currentDayGroup) return;

      // Find the heading element using the data-date attribute
      const formattedDate =
        currentDayGroup.startDateTime.toFormat('yyyy-MM-dd');
      const targetElement = listContainerRef.current.querySelector(
        `div[data-date="${formattedDate}"]`,
      ) as HTMLElement;

      if (targetElement) {
        const containerRect = listContainerRef.current.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();

        // Calculate the scroll position
        const scrollTop =
          listContainerRef.current.scrollTop +
          (targetRect.top - containerRect.top);

        // Scroll the container to the calculated position
        listContainerRef.current.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth',
        });

        // Mark this trip as having been scrolled
        setHasScrolledForTrip(trip.id);
      }
    };

    // Small delay to ensure all elements are rendered
    const timeoutId = setTimeout(scrollToCurrentDay, 100);
    return () => clearTimeout(timeoutId);
  }, [trip, hasScrolledForTrip, currentDayIndex, dayGroups.inTrip]);

  // Reset scroll state when trip changes
  useEffect(() => {
    if (trip && hasScrolledForTrip && hasScrolledForTrip !== trip.id) {
      setHasScrolledForTrip(null);
    }
  }, [trip, hasScrolledForTrip]);

  const pushDialog = useBoundStore((state) => state.pushDialog);
  const openActivityNewDialog = useCallback(() => {
    if (!trip) return;
    pushDialog(ActivityNewDialog, { trip });
  }, [pushDialog, trip]);
  const openAccommodationNewDialog = useCallback(() => {
    if (!trip) return;
    pushDialog(AccommodationNewDialog, { trip });
  }, [pushDialog, trip]);
  const openMacroplanNewDialog = useCallback(() => {
    if (!trip) return;
    pushDialog(MacroplanNewDialog, { trip });
  }, [pushDialog, trip]);

  const hasOutTrip =
    dayGroups.outTrip.activities.length > 0 ||
    dayGroups.outTrip.accommodations.length > 0 ||
    dayGroups.outTrip.macroplans.length > 0;

  return (
    <>
      <Flex
        gap="1"
        justify="between"
        direction={{ initial: 'column', sm: 'row' }}
      >
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <Flex
              ref={listContainerRef}
              className={s.list}
              direction="column"
              gap="2"
              flexGrow="1"
              maxWidth={{ initial: '100%', sm: '50%' }}
            >
              {hasOutTrip ? (
                <>
                  <Heading as="h2" size="4" className={s.listSubheader}>
                    Ideas
                  </Heading>
                  {dayGroups.outTrip.macroplans.map((macroplan) => {
                    return (
                      <Macroplan
                        key={macroplan.id}
                        macroplan={macroplan}
                        className={s.listItem}
                        tripViewMode={TripViewMode.List}
                        userCanEditOrDelete={userCanEditOrDelete}
                        index={0}
                      />
                    );
                  })}
                  {dayGroups.outTrip.accommodations.map((accommodation) => {
                    return (
                      <Accommodation
                        key={`${accommodation.id}`}
                        accommodation={accommodation}
                        tripViewMode={TripViewMode.List}
                        className={s.listItem}
                        timeZone={trip?.timeZone ?? ''}
                        userCanEditOrDelete={userCanEditOrDelete}
                      />
                    );
                  })}
                  {dayGroups.outTrip.activities.map((activity) => {
                    return (
                      <ActivityIdea
                        key={activity.id}
                        className={s.listItem}
                        activity={activity}
                        userCanEditOrDelete={userCanEditOrDelete}
                        tripViewMode={TripViewMode.List}
                      />
                    );
                  })}
                </>
              ) : null}
              {dayGroups.inTrip.map((dayGroup, i) => {
                const dayActivities = Object.values(dayGroup.activities);
                const dayMacroplans = Object.values(dayGroup.macroplans);
                const dayAccommodations = Object.values(
                  dayGroup.accommodations,
                );
                const date = dayGroup.startDateTime.toFormat('yyyy-MM-dd');
                const dayNumber = i + 1;
                const isCurrentDay = currentDayIndex === dayNumber;

                return [
                  // Dummy element as scroll target
                  <div
                    key={`dummy-${date}`}
                    className={s.listItem}
                    style={{ height: '0', visibility: 'hidden' }}
                    data-date={date}
                  />,
                  <Heading
                    key={date}
                    as="h2"
                    size="4"
                    className={clsx(
                      s.listSubheader,
                      isCurrentDay && s.listSubheaderActive,
                    )}
                  >
                    {dayGroup.startDateTime.toFormat('cccc, d LLLL yyyy')}
                  </Heading>,
                  ...dayMacroplans.map((macroplan, i) => {
                    return (
                      <Macroplan
                        key={`${macroplan.id}-${String(i)}`}
                        macroplan={macroplan}
                        className={s.listItem}
                        tripViewMode={TripViewMode.List}
                        userCanEditOrDelete={userCanEditOrDelete}
                        index={i}
                      />
                    );
                  }),
                  ...dayAccommodations.map((accommodation, i) => {
                    const props = dayGroup.accommodationProps.get(
                      accommodation.id,
                    );
                    return (
                      <Accommodation
                        key={`${accommodation.id}-${String(i)}`}
                        accommodation={accommodation}
                        tripViewMode={TripViewMode.List}
                        className={s.listItem}
                        timeZone={trip?.timeZone ?? ''}
                        userCanEditOrDelete={userCanEditOrDelete}
                        {...props}
                      />
                    );
                  }),
                  ...dayActivities.map((activity) => {
                    const columnIndex = dayGroup.activityColumnIndexMap.get(
                      activity.id,
                    );
                    return (
                      <Activity
                        key={activity.id}
                        className={s.listItem}
                        activity={activity}
                        columnIndex={columnIndex?.start ?? 1}
                        columnEndIndex={columnIndex?.end ?? 1}
                        tripViewMode={TripViewMode.List}
                        tripTimeZone={trip?.timeZone ?? ''}
                        tripTimestampStart={trip?.timestampStart ?? 0}
                        userCanEditOrDelete={userCanEditOrDelete}
                      />
                    );
                  }),
                ];
              })}
            </Flex>
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Label>{trip?.title}</ContextMenu.Label>
            <ContextMenu.Item
              disabled={!userCanEditOrDelete}
              onClick={userCanEditOrDelete ? openActivityNewDialog : undefined}
            >
              New activity
            </ContextMenu.Item>

            <ContextMenu.Item
              disabled={!userCanEditOrDelete}
              onClick={
                userCanEditOrDelete ? openAccommodationNewDialog : undefined
              }
            >
              New acommodation
            </ContextMenu.Item>

            <ContextMenu.Item
              disabled={!userCanEditOrDelete}
              onClick={userCanEditOrDelete ? openMacroplanNewDialog : undefined}
            >
              New day plan
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
        <Flex
          direction="column"
          gap="2"
          flexGrow="1"
          maxWidth={{ initial: '100%', sm: '50%' }}
          display={{ initial: 'none', sm: 'flex' }}
          className={s.mapContainer}
        >
          <TripMap useCase="list" />
        </Flex>
      </Flex>

      <Switch>
        <Route
          path={RouteTripListViewActivity.routePath}
          component={ActivityDialog}
        />
        <Route
          path={RouteTripListViewAccommodation.routePath}
          component={AccommodationDialog}
        />
        <Route
          path={RouteTripListViewMacroplan.routePath}
          component={MacroplanDialog}
        />
      </Switch>
    </>
  );
}
