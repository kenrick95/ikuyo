import {
  ClockIcon,
  InfoCircledIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons';
import { Container, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { Link } from 'wouter';
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
      ? DateTime.fromMillis(activity.timestampStart).setZone(
          activity.timeZoneStart ?? trip.timeZone,
        )
      : undefined;
  const activityEndDateTime =
    activity && trip && activity.timestampEnd != null
      ? DateTime.fromMillis(activity.timestampEnd).setZone(
          activity.timeZoneEnd ?? trip.timeZone,
        )
      : undefined;

  const activityTimeStr = useMemo(() => {
    if (activityStartDateTime && activityEndDateTime) {
      if (activityStartDateTime.zoneName === activityEndDateTime.zoneName) {
        // Same timezone, show timezone only once

        if (activityStartDateTime.hasSame(activityEndDateTime, 'day')) {
          // If same day, only show time
          return (
            <>
              {activityStartDateTime.toFormat('d MMMM yyyy')}{' '}
              {activityStartDateTime.toFormat('HH:mm')} &ndash;{' '}
              {activityEndDateTime.toFormat('HH:mm')} (
              {activityStartDateTime.zoneName})
            </>
          );
        }
        return (
          <>
            {activityStartDateTime.toFormat('d MMMM yyyy HH:mm')} &ndash;{' '}
            {activityEndDateTime.toFormat('d MMMM yyyy HH:mm')} (
            {activityStartDateTime.zoneName})
          </>
        );
      } else {
        // Different timezone, show both
        return (
          <>
            {activityStartDateTime.toFormat('d MMMM yyyy HH:mm')} (
            {activityStartDateTime.zoneName}) &ndash;{' '}
            {activityEndDateTime.toFormat('d MMMM yyyy HH:mm')} (
            {activityEndDateTime.zoneName})
          </>
        );
      }
    } else if (activityStartDateTime) {
      // Only start is set
      return (
        <>
          {activityStartDateTime.toFormat('d MMMM yyyy HH:mm')} (
          {activityStartDateTime.zoneName}) &ndash; No end time
        </>
      );
    } else if (activityEndDateTime) {
      // Only end is set
      return (
        <>
          No start time &ndash;{' '}
          {activityEndDateTime.toFormat('d MMMM yyyy HH:mm')} (
          {activityEndDateTime.zoneName})
        </>
      );
    } else {
      return null;
    }
  }, [activityStartDateTime, activityEndDateTime]);

  const description = useParseTextIntoNodes(activity?.description);
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
        {linkTarget ? <Link to={linkTarget}>{activity?.title}</Link> : ''}
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
