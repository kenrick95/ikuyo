import { Container, DataList, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { REGIONS_MAP } from '../data/intl/regions';
import { useCurrentTrip } from './hooks';
import { formatTimestampToReadableDate } from './time';

const containerPx = { initial: '1', md: '0' };
const containerPb = { initial: '9', sm: '5' };
export function TripHome() {
  const trip = useCurrentTrip();

  const tripStartDateTime = trip
    ? DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone)
    : undefined;
  const tripEndDateTime = trip
    ? DateTime.fromMillis(trip.timestampEnd).setZone(trip.timeZone)
    : undefined;
  const tripDuration =
    tripEndDateTime && tripStartDateTime
      ? tripEndDateTime.diff(tripStartDateTime, 'days')
      : undefined;

  return (
    <Container mt="2" pb={containerPb} px={containerPx}>
      <Heading as="h2" size="4" mb="2">
        {trip?.title}
      </Heading>
      <Text as="p" size="2" mb="4">
        {trip ? (
          <>
            {formatTimestampToReadableDate(
              DateTime.fromMillis(trip.timestampStart, {
                zone: trip.timeZone,
              }),
            )}{' '}
            &ndash;{' '}
            {formatTimestampToReadableDate(
              DateTime.fromMillis(trip.timestampEnd, {
                zone: trip.timeZone,
              }).minus({
                day: 1,
              }),
            )}{' '}
            ({trip.timeZone})
          </>
        ) : null}
      </Text>
      <Heading as="h3" size="3" mb="2">
        Details
      </Heading>
      <DataList.Root size="2" mb="4">
        <DataList.Item>
          <DataList.Label>Destination's region</DataList.Label>
          <DataList.Value>
            {trip?.region ? REGIONS_MAP[trip.region] : null}
          </DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Destination's currency</DataList.Label>
          <DataList.Value>{trip?.currency}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Origin's currency</DataList.Label>
          <DataList.Value>{trip?.originCurrency}</DataList.Value>
        </DataList.Item>
      </DataList.Root>
      <Heading as="h3" size="3" mb="2">
        Statistics
      </Heading>
      <DataList.Root size="2" mb="4">
        <DataList.Item>
          <DataList.Label>Days</DataList.Label>
          <DataList.Value>{tripDuration?.days}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Activities</DataList.Label>
          <DataList.Value>{trip?.activityIds.length}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Day plans</DataList.Label>
          <DataList.Value>{trip?.macroplanIds.length}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Accommodations</DataList.Label>
          <DataList.Value>{trip?.accommodationIds?.length}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Participants</DataList.Label>
          <DataList.Value>{trip?.tripUserIds?.length}</DataList.Value>
        </DataList.Item>
      </DataList.Root>
    </Container>
  );
}
