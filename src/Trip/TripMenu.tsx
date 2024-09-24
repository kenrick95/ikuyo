import { Button, DropdownMenu } from '@radix-ui/themes';
import { useLocation } from 'wouter';
import { ROUTES } from '../routes';
import { TripViewModeSelector } from './TripViewModeSelector';
import { TripViewMode } from './TripViewMode';
import { HamburgerMenuIcon } from '@radix-ui/react-icons';

export function TripMenu({
  setEditTripDialgoOpen,
  setNewActivityDialogOpen,
  tripViewMode,
  setTripViewMode,
}: {
  setEditTripDialgoOpen: (v: boolean) => void;
  setNewActivityDialogOpen: (v: boolean) => void;
  tripViewMode: TripViewMode;
  setTripViewMode: (newMode: TripViewMode) => void;
}) {
  const [, setLocation] = useLocation();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="outline">
          <HamburgerMenuIcon />
          Actions
          <DropdownMenu.TriggerIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>Activity</DropdownMenu.Label>
        <DropdownMenu.Item
          onClick={() => {
            setNewActivityDialogOpen(true);
          }}
        >
          New activity
        </DropdownMenu.Item>

        <DropdownMenu.Separator />
        <DropdownMenu.Label>Trip</DropdownMenu.Label>

        <DropdownMenu.Item>
          View as <TripViewModeSelector mode={tripViewMode} setMode={setTripViewMode} />
        </DropdownMenu.Item>

        <DropdownMenu.Item
          onClick={() => {
            setEditTripDialgoOpen(true);
          }}
        >
          Edit trip
        </DropdownMenu.Item>

        <DropdownMenu.Separator />
        <DropdownMenu.Label>Trips</DropdownMenu.Label>
        <DropdownMenu.Item
          onClick={() => {
            setLocation(ROUTES.Trips);
          }}
        >
          View trips
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
