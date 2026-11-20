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
  Button,
  DropdownMenu,
  SegmentedControl,
  Text,
  Tooltip,
} from '@radix-ui/themes';
import { memo, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { RouteTransition } from '../../Routes/RouteTransition';
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
    for (const tab of availableTabs) {
      if (location.startsWith(tab)) {
        return tab;
      }
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
    <nav className={s.nav} aria-label="Trip sections">
      <RouteTransition default="vt-chrome">
        <div className={s.controlContainer}>
          <SegmentedControl.Root
            aria-label="Trip view"
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
                aria-label="Overview"
                value={RouteTripHome.routePath}
                data-state={
                  activeTab === (RouteTripHome.routePath as string)
                    ? 'on'
                    : 'off'
                }
              >
                <HomeIcon className={s.controlIcon} />
                <Text size="1" className={s.controlText}>
                  Overview
                </Text>
              </SegmentedControl.Item>
            </Tooltip>
            <Tooltip content="Timetable view">
              <SegmentedControl.Item
                aria-label="Timetable"
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
                aria-label="List"
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
                aria-label="Expenses"
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
          </SegmentedControl.Root>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button
                type="button"
                size="3"
                color="gray"
                variant={activeTab === RouteOthers ? 'soft' : 'ghost'}
                className={s.othersButton}
                aria-label="Others"
              >
                <HamburgerMenuIcon className={s.controlIcon} />
                <Text size="1" className={s.controlText}>
                  Others
                </Text>
              </Button>
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
        </div>
      </RouteTransition>
    </nav>
  );
}
export const TripMenuFloating = memo(TripMenuFloatingInner);
