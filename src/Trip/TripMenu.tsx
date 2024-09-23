import { Button, DropdownMenu } from '@radix-ui/themes';
import { useLocation } from 'wouter';
import { ROUTES } from '../routes';

export function TripMenu({
  setEditTripDialgoOpen,
  setNewActivityDialogOpen,
}: {
  setEditTripDialgoOpen: (v: boolean) => void;
  setNewActivityDialogOpen: (v: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="outline">
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
