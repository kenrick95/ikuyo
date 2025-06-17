import {
  ClockIcon,
  InfoCircledIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons';
import { Container, Heading, Text } from '@radix-ui/themes';
import { Link } from 'wouter';
import { formatAccommodationTimeRange } from '../../Accommodation/time';
import { useParseTextIntoNodes } from '../../common/text/parseTextIntoNodes';
import {
  RouteTrip,
  RouteTripListView,
  RouteTripListViewAccommodation,
  RouteTripTimetableView,
  RouteTripTimetableViewAccommodation,
} from '../../Routes/routes';
import { useTrip, useTripAccommodation } from '../../Trip/store/hooks';

export function AccommodationPopup({
  accommodationId,
  className,
  linkTargetBasePage,
}: {
  accommodationId: string;
  className: string;
  linkTargetBasePage: 'timetable' | 'list';
}) {
  const accommodation = useTripAccommodation(accommodationId);
  const { trip } = useTrip(accommodation?.tripId);

  const notes = useParseTextIntoNodes(accommodation?.notes);
  const linkTarget = accommodation?.tripId
    ? `~${RouteTrip.asRouteTarget(accommodation?.tripId)}${
        linkTargetBasePage === 'timetable'
          ? `${RouteTripTimetableView.asRouteTarget()}${RouteTripTimetableViewAccommodation.asRouteTarget(accommodation?.id)}`
          : `${RouteTripListView.asRouteTarget()}${RouteTripListViewAccommodation.asRouteTarget(accommodation?.id)}`
      }`
    : null;

  return (
    <Container>
      <Heading as="h3" size="2">
        {linkTarget ? <Link to={linkTarget}>{accommodation?.name}</Link> : ''}
      </Heading>
      <Text as="p" size="1">
        <ClockIcon style={{ verticalAlign: '-2px' }} />{' '}
        {trip && accommodation
          ? formatAccommodationTimeRange({
              timestampCheckIn: accommodation.timestampCheckIn,
              timestampCheckOut: accommodation.timestampCheckOut,
              timeZone: trip.timeZone,
            })
          : null}
      </Text>
      {accommodation?.address ? (
        <Text as="p" size="1">
          <SewingPinIcon style={{ verticalAlign: '-2px' }} />{' '}
          {accommodation.address}
        </Text>
      ) : null}
      {notes.length > 0 ? (
        <Text as="p" size="1" className={className}>
          <InfoCircledIcon style={{ verticalAlign: '-2px' }} /> {notes}
        </Text>
      ) : null}
    </Container>
  );
}
