import { CalendarIcon, ListBulletIcon, TableIcon } from '@radix-ui/react-icons';
import { SegmentedControl, Tooltip } from '@radix-ui/themes';
import { useLocation } from 'wouter';
import { ROUTES_TRIP } from '../Routes/routes';
import s from './TripMenuFloating.module.css';

export function TripMenuFloating() {
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
          <Tooltip content="Timetable view">
            <SegmentedControl.Item
              value={ROUTES_TRIP.TimetableView}
              data-state={
                location === (ROUTES_TRIP.TimetableView as string)
                  ? 'on'
                  : 'off'
              }
            >
              <CalendarIcon className={s.controlIcon} />
            </SegmentedControl.Item>
          </Tooltip>
          <Tooltip content="List view">
            <SegmentedControl.Item
              value={ROUTES_TRIP.ListView}
              data-state={
                location === (ROUTES_TRIP.ListView as string) ? 'on' : 'off'
              }
            >
              <ListBulletIcon className={s.controlIcon} />
            </SegmentedControl.Item>
          </Tooltip>
          <Tooltip content="Expenses">
            <SegmentedControl.Item
              value={ROUTES_TRIP.Expenses}
              data-state={
                location === (ROUTES_TRIP.Expenses as string) ? 'on' : 'off'
              }
            >
              <TableIcon className={s.controlIcon} />
            </SegmentedControl.Item>
          </Tooltip>
        </SegmentedControl.Root>
      </div>
    </nav>
  );
}
