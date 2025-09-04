import {
  CalendarIcon,
  ChatBubbleIcon,
  CheckboxIcon,
  HamburgerMenuIcon,
  HomeIcon,
  ListBulletIcon,
  SewingPinIcon,
  TableIcon,
} from '@radix-ui/react-icons';
import {
  DropdownMenu,
  SegmentedControl,
  Text,
  Tooltip,
} from '@radix-ui/themes';
import { memo, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  RouteTripComment,
  RouteTripExpenses,
  RouteTripHome,
  RouteTripListView,
  RouteTripMap,
  RouteTripTaskList,
  RouteTripTimetableView,
} from '../../Routes/routes';
import s from './TripMenuFloating.module.css';

const RouteOthers = '##others';
const availableTabs = [
  RouteTripHome.routePath,
  RouteTripTimetableView.routePath,
  RouteTripListView.routePath,
  RouteTripExpenses.routePath,
  RouteOthers,
];

function TripMenuFloatingInner() {
  const [location, setLocation] = useLocation();
  const activeTab = useMemo(() => {
    if (availableTabs.includes(location)) {
      return location;
    }
    return RouteOthers;
  }, [location]);
  const handleRouteClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.currentTarget.getAttribute('data-target');
      if (target) {
        setLocation(target);
      }
    },
    [setLocation],
  );
  return (
    <nav className={s.nav}>
      <div className={s.controlContainer}>
        <SegmentedControl.Root
          defaultValue={activeTab}
          value={activeTab}
          size="3"
          variant="classic"
          className={s.control}
          onValueChange={(value) => {
            if (value === RouteOthers) {
              return;
            }
            setLocation(value);
          }}
        >
          <Tooltip content="Trip home">
            <SegmentedControl.Item
              value={RouteTripHome.routePath}
              data-state={
                activeTab === (RouteTripHome.routePath as string) ? 'on' : 'off'
              }
            >
              <HomeIcon className={s.controlIcon} />
              <Text size="1" className={s.controlText}>
                Home
              </Text>
            </SegmentedControl.Item>
          </Tooltip>
          <Tooltip content="Timetable view">
            <SegmentedControl.Item
              value={RouteTripTimetableView.routePath}
              data-state={
                activeTab === (RouteTripTimetableView.routePath as string)
                  ? 'on'
                  : 'off'
              }
            >
              <CalendarIcon className={s.controlIcon} />
              <Text size="1" className={s.controlText}>
                Timetable
              </Text>
            </SegmentedControl.Item>
          </Tooltip>
          <Tooltip content="List view">
            <SegmentedControl.Item
              value={RouteTripListView.routePath}
              data-state={
                activeTab === (RouteTripListView.routePath as string)
                  ? 'on'
                  : 'off'
              }
            >
              <ListBulletIcon className={s.controlIcon} />
              <Text size="1" className={s.controlText}>
                List
              </Text>
            </SegmentedControl.Item>
          </Tooltip>
          <Tooltip content="Expenses">
            <SegmentedControl.Item
              value={RouteTripExpenses.routePath}
              data-state={
                activeTab === (RouteTripExpenses.routePath as string)
                  ? 'on'
                  : 'off'
              }
            >
              <TableIcon className={s.controlIcon} />
              <Text size="1" className={s.controlText}>
                Expenses
              </Text>
            </SegmentedControl.Item>
          </Tooltip>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <SegmentedControl.Item
                value={RouteOthers}
                data-state={activeTab === RouteOthers ? 'on' : 'off'}
              >
                <HamburgerMenuIcon className={s.controlIcon} />
                <Text size="1" className={s.controlText}>
                  Others
                </Text>
              </SegmentedControl.Item>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                data-target={RouteTripMap.routePath}
                onClick={handleRouteClick}
              >
                <SewingPinIcon /> Map
              </DropdownMenu.Item>
              <DropdownMenu.Item
                data-target={RouteTripTaskList.routePath}
                onClick={handleRouteClick}
              >
                <CheckboxIcon /> Tasks
              </DropdownMenu.Item>
              <DropdownMenu.Item
                data-target={RouteTripComment.routePath}
                onClick={handleRouteClick}
              >
                <ChatBubbleIcon /> Comments
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </SegmentedControl.Root>
      </div>
    </nav>
  );
}
export const TripMenuFloating = memo(TripMenuFloatingInner);
