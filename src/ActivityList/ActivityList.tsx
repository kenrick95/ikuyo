import { Flex, Heading } from '@radix-ui/themes';
import { Activity } from '../Activity/Activity';
import s from './ActivityList.module.css';
import { groupActivitiesByDays } from '../Activity/eventGrouping';
import { useMemo } from 'react';
import { TripViewMode } from '../Trip/TripViewMode';
import { DbTripWithActivityAccommodation } from '../Trip/db';
import { Accommodation } from '../Accommodation/Accommodation';

export function ActivityList({
  trip,
}: {
  trip: DbTripWithActivityAccommodation;
}) {
  const dayGroups = useMemo(() => groupActivitiesByDays(trip), [trip]);

  return (
    <Flex className={s.list} direction="column" gap="2">
      {dayGroups.map((dayGroup) => {
        return [
          <Heading
            key={dayGroup.startDateTime.toISO()}
            as="h2"
            size="4"
            className={s.listSubheader}
          >
            {dayGroup.startDateTime.toFormat(`cccc, dd LLLL yyyy`)}
          </Heading>,
          ...Object.values(dayGroup.accommodations).map((accommodation, i) => {
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
          }),
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
  );
}
