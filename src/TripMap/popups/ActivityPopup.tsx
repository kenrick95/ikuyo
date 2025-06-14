import {
  ClockIcon,
  InfoCircledIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons';
import { Container, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
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
      ? DateTime.fromMillis(activity.timestampStart).setZone(trip.timeZone)
      : undefined;
  const activityEndDateTime =
    activity && trip && activity.timestampEnd != null
      ? DateTime.fromMillis(activity.timestampEnd).setZone(trip.timeZone)
      : undefined;

  const activityStartStr = activityStartDateTime
    ? activityStartDateTime.toFormat('dd MMMM yyyy HH:mm')
    : undefined;
  const activityEndStr = activityEndDateTime
    ? activityStartDateTime?.hasSame(activityEndDateTime, 'day')
      ? // If same day, only show time
        activityEndDateTime.toFormat('HH:mm')
      : activityEndDateTime.toFormat('dd MMMM yyyy HH:mm')
    : undefined;

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
      {activity ? (
        activityStartStr && activityEndStr ? (
          // Both are set
          <Text as="p" size="1">
            <ClockIcon style={{ verticalAlign: '-2px' }} /> {activityStartStr}
            &ndash;{activityEndStr}
          </Text>
        ) : activityStartStr ? (
          // Only start is set
          <Text as="p" size="1">
            <ClockIcon style={{ verticalAlign: '-2px' }} /> {activityStartStr}
            &ndash;No end time
          </Text>
        ) : activityEndStr ? (
          // Only end is set
          <Text as="p" size="1">
            <ClockIcon style={{ verticalAlign: '-2px' }} /> No start time&ndash;
            {activityEndStr}
          </Text>
        ) : // Both are not set
        null
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
