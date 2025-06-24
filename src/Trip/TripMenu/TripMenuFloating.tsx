import {
  CalendarIcon,
  ChatBubbleIcon,
  HomeIcon,
  ListBulletIcon,
  SewingPinIcon,
  TableIcon,
} from '@radix-ui/react-icons';
import { SegmentedControl, Tooltip } from '@radix-ui/themes';
import { memo } from 'react';
import { useLocation } from 'wouter';
import {
  RouteTripComment,
  RouteTripExpenses,
  RouteTripHome,
  RouteTripListView,
  RouteTripMap,
  RouteTripTimetableView,
} from '../../Routes/routes';
import s from './TripMenuFloating.module.css';

function TripMenuFloatingInner() {
  const [location, setLocation] = useLocation();
  return (
    <nav className={s.nav}>
      <div className={s.controlContainer}>
        <SegmentedControl.Root
          defaultValue={location}
          value={location}
          size="3"
          variant="classic"
          className={s.control}
          onValueChange={(value) => {
            setLocation(value);
          }}
        >
          <Tooltip content="Trip home">
            <SegmentedControl.Item
              value={RouteTripHome.routePath}
              data-state={
                location === (RouteTripHome.routePath as string) ? 'on' : 'off'
              }
            >
              <HomeIcon className={s.controlIcon} />
            </SegmentedControl.Item>
          </Tooltip>
          <Tooltip content="Timetable view">
            <SegmentedControl.Item
              value={RouteTripTimetableView.routePath}
              data-state={
                location === (RouteTripTimetableView.routePath as string)
                  ? 'on'
                  : 'off'
              }
            >
              <CalendarIcon className={s.controlIcon} />
            </SegmentedControl.Item>
          </Tooltip>
          <Tooltip content="List view">
            <SegmentedControl.Item
              value={RouteTripListView.routePath}
              data-state={
                location === (RouteTripListView.routePath as string)
                  ? 'on'
                  : 'off'
              }
            >
              <ListBulletIcon className={s.controlIcon} />
            </SegmentedControl.Item>
          </Tooltip>
          <Tooltip content="Map view">
            <SegmentedControl.Item
              value={RouteTripMap.routePath}
              data-state={
                location === (RouteTripMap.routePath as string) ? 'on' : 'off'
              }
            >
              <SewingPinIcon className={s.controlIcon} />
            </SegmentedControl.Item>
          </Tooltip>
          <Tooltip content="Expenses">
            <SegmentedControl.Item
              value={RouteTripExpenses.routePath}
              data-state={
                location === (RouteTripExpenses.routePath as string)
                  ? 'on'
                  : 'off'
              }
            >
              <TableIcon className={s.controlIcon} />
            </SegmentedControl.Item>
          </Tooltip>
          <Tooltip content="Comments">
            <SegmentedControl.Item
              value={RouteTripComment.routePath}
              data-state={
                location === (RouteTripComment.routePath as string)
                  ? 'on'
                  : 'off'
              }
            >
              <ChatBubbleIcon className={s.controlIcon} />
            </SegmentedControl.Item>
          </Tooltip>
        </SegmentedControl.Root>
      </div>
    </nav>
  );
}
export const TripMenuFloating = memo(TripMenuFloatingInner);
