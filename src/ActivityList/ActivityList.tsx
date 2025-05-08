import { Flex, Heading } from '@radix-ui/themes';
import { useMemo } from 'react';
import { Route, Switch } from 'wouter';
import { Accommodation } from '../Accommodation/Accommodation';
import { AccommodationDialog } from '../Accommodation/AccommodationDialog';
import { Activity } from '../Activity/Activity';
import { ActivityDialog } from '../Activity/ActivityDialog';
import { groupActivitiesByDays } from '../Activity/eventGrouping';
import { Macroplan } from '../Macroplan/Macroplan';
import { MacroplanDialog } from '../Macroplan/MacroplanDialog';
import {
  RouteTripListViewAccommodation,
  RouteTripListViewActivity,
  RouteTripListViewMacroplan,
} from '../Routes/routes';
import { TripViewMode } from '../Trip/TripViewMode';
import { useTrip } from '../Trip/context';
import s from './ActivityList.module.css';

export function ActivityList() {
  const trip = useTrip();
  const dayGroups = useMemo(() => groupActivitiesByDays(trip), [trip]);

  return (
    <>
      <Flex className={s.list} direction="column" gap="2">
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
                const props = dayGroup.accommodationProps.get(accommodation.id);
                return (
                  <Accommodation
                    key={`${accommodation.id}-${String(i)}`}
                    accommodation={accommodation}
                    tripViewMode={TripViewMode.List}
                    className={s.listItem}
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
                />
              );
            }),
          ];
        })}
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
