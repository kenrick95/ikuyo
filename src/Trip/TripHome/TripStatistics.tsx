import { Share1Icon } from '@radix-ui/react-icons';
import { Button, DataList, Heading } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useMemo } from 'react';
import { Link } from 'wouter';
import { useCurrentUser } from '../../Auth/hooks';
import { REGIONS_MAP, type RegionCode } from '../../data/intl/regions';
import { useBoundStore } from '../../data/store';
import { RouteTripExpenses } from '../../Routes/routes';
import { TripUserRole } from '../../User/TripUserRole';
import { useCurrentTrip, useTripExpenses } from '../store/hooks';
import { TripSharingDialog } from '../TripDialog/TripSharingDialog';

const statisticsOrientation = {
  initial: 'horizontal' as const,
  md: 'vertical' as const,
};
export function TripStatistics() {
  const { trip } = useCurrentTrip();
  const pushDialog = useBoundStore((state) => state.pushDialog);
  const currentUser = useCurrentUser();
  const isGuest = !currentUser?.email;
  const userIsOwner = useMemo(() => {
    return trip?.currentUserRole === TripUserRole.Owner;
  }, [trip?.currentUserRole]);
  const canShare = userIsOwner && !isGuest;
  const openTripSharingDialog = useCallback(() => {
    if (trip && canShare) {
      pushDialog(TripSharingDialog, { tripId: trip.id });
    }
  }, [trip, canShare, pushDialog]);

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

  // Calculate expense summary
  const expenses = useTripExpenses(trip?.expenseIds ?? []);
  const expenseSummary = useMemo(() => {
    if (!expenses || expenses.length === 0)
      return { total: 0, currency: trip?.originCurrency || 'USD' };

    const total = expenses.reduce((sum, expense) => {
      return sum + (expense.amountInOriginCurrency || expense.amount);
    }, 0);

    return { total, currency: trip?.originCurrency || 'USD' };
  }, [expenses, trip?.originCurrency]);

  return (
    <>
      <Heading as="h3" size="4" mt="1">
        Details
      </Heading>
      <DataList.Root size="2" mb="2" orientation={statisticsOrientation}>
        <DataList.Item>
          <DataList.Label>Destination's region</DataList.Label>
          <DataList.Value>
            {trip?.region ? REGIONS_MAP[trip.region as RegionCode] : null}
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
        {/* Expense Summary */}
        <DataList.Item>
          <DataList.Label>Total Expenses</DataList.Label>
          <DataList.Value>
            {expenseSummary.currency} {expenseSummary.total.toFixed(2)}{' '}
            <Button
              asChild
              variant="ghost"
              size="1"
              ml="2"
              style={{ alignSelf: 'center' }}
            >
              <Link to={RouteTripExpenses.asRouteTarget()}>View all</Link>
            </Button>
          </DataList.Value>
        </DataList.Item>
      </DataList.Root>
      <Heading as="h3" size="3">
        Statistics
      </Heading>
      <DataList.Root size="2" mb="2" orientation={statisticsOrientation}>
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
          <DataList.Value>
            {trip?.tripUserIds?.length}
            <Button
              variant="outline"
              mx="2"
              size="1"
              onClick={openTripSharingDialog}
              disabled={!canShare}
            >
              <Share1Icon />
              Share trip
            </Button>
          </DataList.Value>
        </DataList.Item>
      </DataList.Root>
    </>
  );
}
