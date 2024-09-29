import { Button, DropdownMenu } from '@radix-ui/themes';
import { useLocation } from 'wouter';
import { ROUTES } from '../routes';
import { TripViewMode } from './TripViewMode';
import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { TripSharing } from '../toggles';

export function TripMenu({
  setEditTripDialogOpen,
  setShareTripDialogOpen,
  setNewActivityDialogOpen,
  setDeleteTripDialogOpen,
  tripViewMode,
  setTripViewMode,
}: {
  setEditTripDialogOpen: (v: boolean) => void;
  setShareTripDialogOpen: (v: boolean) => void;
  setNewActivityDialogOpen: (v: boolean) => void;
  setDeleteTripDialogOpen: (v: boolean) => void;
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

        <DropdownMenu.Item
          onClick={() => {
            if (tripViewMode === TripViewMode.List) {
              setTripViewMode(TripViewMode.Timetable);
            } else {
              setTripViewMode(TripViewMode.List);
            }
          }}
        >
          View as {tripViewMode === TripViewMode.List ? 'timetable' : 'list'}
        </DropdownMenu.Item>

        <DropdownMenu.Item
          onClick={() => {
            setEditTripDialogOpen(true);
          }}
        >
          Edit trip
        </DropdownMenu.Item>

        {TripSharing ? (
          <DropdownMenu.Item
            onClick={() => {
              setShareTripDialogOpen(true);
            }}
          >
            Share trip
          </DropdownMenu.Item>
        ) : null}

        <DropdownMenu.Item
          onClick={() => {
            setDeleteTripDialogOpen(true);
          }}
        >
          Delete trip
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
