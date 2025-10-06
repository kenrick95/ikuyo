import { DoubleArrowRightIcon } from '@radix-ui/react-icons';
import { Badge, Heading, Select, Skeleton, Tooltip } from '@radix-ui/themes';
import { useCallback, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { Navbar } from '../../Nav/Navbar';
import {
  RouteTripComment,
  RouteTripExpenses,
  RouteTripHome,
  RouteTripListView,
  RouteTripMap,
  RouteTripTaskList,
  RouteTripTimetableView,
} from '../../Routes/routes';
import { useCurrentTrip } from '../store/hooks';
import { TripMenu } from '../TripMenu/TripMenu';
import s from './TripNavbar.module.css';

export function TripNavbar() {
  const { trip } = useCurrentTrip();
  const [location, setLocation] = useLocation();
  const selection = useMemo(() => {
    const parts = location.split('/');
    if (parts[1]) return `/${parts[1]}`;
    return RouteTripHome.routePath;
  }, [location]);
  const handleLocationSelectorChange = useCallback(
    (value: string) => {
      setLocation(value);
    },
    [setLocation],
  );
  const selector = useMemo(() => {
    return (
      <Select.Root
        value={selection}
        onValueChange={handleLocationSelectorChange}
        size="3"
      >
        <Select.Trigger
          radius="large"
          variant="ghost"
          color="gray"
          className={s.tripTabSelector}
        />
        <Select.Content position="popper">
          <Select.Item value={RouteTripHome.routePath}>Overview</Select.Item>
          <Select.Item value={RouteTripTimetableView.routePath}>
            Timetable
          </Select.Item>
          <Select.Item value={RouteTripListView.routePath}>List</Select.Item>
          <Select.Item value={RouteTripMap.routePath}>Map</Select.Item>
          <Select.Item value={RouteTripExpenses.routePath}>
            Expenses
          </Select.Item>
          <Select.Item value={RouteTripTaskList.routePath}>Tasks</Select.Item>
          <Select.Item value={RouteTripComment.routePath}>Comment</Select.Item>
        </Select.Content>
      </Select.Root>
    );
  }, [selection, handleLocationSelectorChange]);
  return (
    <Navbar
      leftItems={[
        <Heading
          as="h1"
          size={{ initial: '3', xs: '5' }}
          className={s.tripTitleHeading}
          key="title"
        >
          <Link to={RouteTripHome.asRouteTarget()} className={s.tripTitle}>
            {trip?.title ?? <Skeleton>Trip title</Skeleton>}
          </Link>
          <DoubleArrowRightIcon className={s.tripTitleDivider} />
          {selector}
        </Heading>,
        selection === RouteTripTimetableView.routePath ||
        selection === RouteTripListView.routePath ||
        selection === RouteTripExpenses.routePath ? (
          <Tooltip
            key="tz"
            content={`${selection === RouteTripTimetableView.routePath ? 'Timetable' : selection === RouteTripExpenses.routePath ? 'Expense' : 'List'} is displayed in ${trip?.timeZone} time zone`}
          >
            <Badge key="tz" size={{ initial: '1', xs: '2' }} color="gray">
              {trip?.timeZone}
            </Badge>
          </Tooltip>
        ) : undefined,
      ].filter((item): item is React.ReactElement => {
        return item !== undefined;
      })}
      rightItems={[<TripMenu key="menu" />]}
    />
  );
}
