import {
  ClockIcon,
  InfoCircledIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons';
import { Container, Heading, Text } from '@radix-ui/themes';

import { useMemo } from 'react';
import { Link } from 'wouter';
import { getActivityDisplayTitle } from '../../Activity/activityTitle';
import { toFormat } from '../../common/dateTime/temporalFormatter';
import { useParseTextIntoNodes } from '../../common/text/parseTextIntoNodes';
import {
  RouteTrip,
  RouteTripListView,
  RouteTripListViewActivity,
  RouteTripTimetableView,
  RouteTripTimetableViewActivity,
} from '../../Routes/routes';
import { useTrip, useTripActivity } from '../../Trip/store/hooks';
import { LocationType } from '../constants';

export function ActivityPopup({
  activityId,
  type,
  className,
  linkTargetBasePage,
}: {
  activityId: string;
  type: typeof LocationType.Activity | typeof LocationType.ActivityDestination;
  className: string;
  linkTargetBasePage: 'timetable' | 'list';
}) {
  const activity = useTripActivity(activityId);
  const { trip } = useTrip(activity?.tripId);

  const activityStartDateTime =
    activity && trip && activity.timestampStart != null
      ? Temporal.Instant.fromEpochMilliseconds(
          activity.timestampStart,
        ).toZonedDateTimeISO(activity.timeZoneStart ?? trip.timeZone)
      : undefined;
  const activityEndDateTime =
    activity && trip && activity.timestampEnd != null
      ? Temporal.Instant.fromEpochMilliseconds(
          activity.timestampEnd,
        ).toZonedDateTimeISO(activity.timeZoneEnd ?? trip.timeZone)
      : undefined;

  const activityTimeStr = useMemo(() => {
    if (activityStartDateTime && activityEndDateTime) {
      if (activityStartDateTime.timeZoneId === activityEndDateTime.timeZoneId) {
        // Same timezone, show timezone only once

        if (
          activityStartDateTime
            .toPlainDate()
            .equals(activityEndDateTime.toPlainDate())
        ) {
          // If same day, only show time
          return (
            <>
              {toFormat('d MMMM yyyy', activityStartDateTime)}{' '}
              {toFormat('HH:mm', activityStartDateTime)} &ndash;{' '}
              {toFormat('HH:mm', activityEndDateTime)} (
              {activityStartDateTime.timeZoneId})
            </>
          );
        }
        return (
          <>
            {toFormat('d MMMM yyyy HH:mm', activityStartDateTime)} &ndash;{' '}
            {toFormat('d MMMM yyyy HH:mm', activityEndDateTime)} (
            {activityStartDateTime.timeZoneId})
          </>
        );
      } else {
        // Different timezone, show both
        return (
          <>
            {toFormat('d MMMM yyyy HH:mm', activityStartDateTime)} (
            {activityStartDateTime.timeZoneId}) &ndash;{' '}
            {toFormat('d MMMM yyyy HH:mm', activityEndDateTime)} (
            {activityEndDateTime.timeZoneId})
          </>
        );
      }
    } else if (activityStartDateTime) {
      // Only start is set
      return (
        <>
          {toFormat('d MMMM yyyy HH:mm', activityStartDateTime)} (
          {activityStartDateTime.timeZoneId}) &ndash; No end time
        </>
      );
    } else if (activityEndDateTime) {
      // Only end is set
      return (
        <>
          No start time &ndash;{' '}
          {toFormat('d MMMM yyyy HH:mm', activityEndDateTime)} (
          {activityEndDateTime.timeZoneId})
        </>
      );
    } else {
      return null;
    }
  }, [activityStartDateTime, activityEndDateTime]);

  const description = useParseTextIntoNodes(activity?.description);
  const activityTitle = activity ? getActivityDisplayTitle(activity) : '';
  const linkTarget = activity?.tripId
    ? `~${RouteTrip.asRouteTarget(activity?.tripId)}${
        linkTargetBasePage === 'timetable'
          ? `${RouteTripTimetableView.asRouteTarget()}${RouteTripTimetableViewActivity.asRouteTarget(activity?.id)}`
          : `${RouteTripListView.asRouteTarget()}${RouteTripListViewActivity.asRouteTarget(activity?.id)}`
      }`
    : null;

  return (
    <Container>
      <Heading as="h3" size="2">
        {linkTarget ? <Link to={linkTarget}>{activityTitle}</Link> : ''}
      </Heading>
      {activityTimeStr ? (
        <Text as="p" size="1">
          <ClockIcon style={{ verticalAlign: '-2px' }} /> {activityTimeStr}
        </Text>
      ) : null}

      {type === LocationType.Activity ? (
        activity?.location ? (
          <Text as="p" size="1">
            <SewingPinIcon style={{ verticalAlign: '-2px' }} />{' '}
            <Text weight="bold">{activity.location}</Text>
            {activity.locationDestination ? (
              <>
                {' → '}
                {<Text color="gray">{activity.locationDestination}</Text>}
              </>
            ) : (
              ''
            )}
          </Text>
        ) : null
      ) : activity?.locationDestination ? (
        <Text as="p" size="1">
          <SewingPinIcon style={{ verticalAlign: '-2px' }} />{' '}
          {activity.location ? (
            <>
              {<Text color="gray">{activity.location}</Text>}
              {' → '}
            </>
          ) : (
            ''
          )}
          <Text weight="bold">{activity.locationDestination}</Text>
        </Text>
      ) : null}
      {description.length > 0 ? (
        <Text as="p" size="1" className={className}>
          <InfoCircledIcon style={{ verticalAlign: '-2px' }} /> {description}
        </Text>
      ) : null}
    </Container>
  );
}
