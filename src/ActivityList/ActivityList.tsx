import { ContextMenu, Flex, Heading } from '@radix-ui/themes';
import { useCallback, useMemo } from 'react';
import { Route, Switch } from 'wouter';
import { Accommodation } from '../Accommodation/Accommodation';
import { AccommodationDialog } from '../Accommodation/AccommodationDialog';
import { AccommodationNewDialog } from '../Accommodation/AccommodationNewDialog';
import { Activity } from '../Activity/Activity';
import { ActivityDialog } from '../Activity/ActivityDialog';
import { ActivityNewDialog } from '../Activity/ActivityNewDialog';
import { groupActivitiesByDays } from '../Activity/eventGrouping';
import { useBoundStore } from '../data/store';
import { Macroplan } from '../Macroplan/Macroplan';
import { MacroplanDialog } from '../Macroplan/MacroplanDialog';
import { MacroplanNewDialog } from '../Macroplan/MacroplanNewDialog';
import {
  RouteTripListViewAccommodation,
  RouteTripListViewActivity,
  RouteTripListViewMacroplan,
} from '../Routes/routes';
import {
  useCurrentTrip,
  useTripAccommodations,
  useTripActivities,
  useTripMacroplans,
} from '../Trip/hooks';
import { TripViewMode } from '../Trip/TripViewMode';
import { TripMap } from '../TripMap/TripMap';
import s from './ActivityList.module.css';

export function ActivityList() {
  const trip = useCurrentTrip();
  const activities = useTripActivities(trip?.activityIds ?? []);
  const tripAccommodations = useTripAccommodations(
    trip?.accommodationIds ?? [],
  );
  const tripMacroplans = useTripMacroplans(trip?.macroplanIds ?? []);

  const dayGroups = useMemo(() => {
    if (!trip || !activities || !tripAccommodations || !tripMacroplans)
      return [];
    return groupActivitiesByDays({
      trip,
      activities,
      accommodations: tripAccommodations,
      macroplans: tripMacroplans,
    });
  }, [trip, activities, tripAccommodations, tripMacroplans]);
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
              className={s.list}
              direction="column"
              gap="2"
              flexGrow="1"
              maxWidth={{ initial: '100%', sm: '50%' }}
            >
              {dayGroups.map((dayGroup) => {
                return [
                  <Heading
                    key={dayGroup.startDateTime.toISO()}
                    as="h2"
                    size="4"
                    className={s.listSubheader}
                  >
                    {dayGroup.startDateTime.toFormat('cccc, dd LLLL yyyy')}
                  </Heading>,
                  ...Object.values(dayGroup.macroplans).map((macroplan, i) => {
                    return (
                      <Macroplan
                        key={`${macroplan.id}-${String(i)}`}
                        macroplan={macroplan}
                        className={s.listItem}
                        tripViewMode={TripViewMode.List}
                      />
                    );
                  }),
                  ...Object.values(dayGroup.accommodations).map(
                    (accommodation, i) => {
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
                          {...props}
                        />
                      );
                    },
                  ),
                  ...Object.values(dayGroup.activities).map((activity) => {
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
                      />
                    );
                  }),
                ];
              })}
            </Flex>
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Label>{trip?.title}</ContextMenu.Label>
            <ContextMenu.Item onClick={openActivityNewDialog}>
              New activity
            </ContextMenu.Item>

            <ContextMenu.Item onClick={openAccommodationNewDialog}>
              New acommodation
            </ContextMenu.Item>

            <ContextMenu.Item onClick={openMacroplanNewDialog}>
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
        >
          <TripMap />
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
