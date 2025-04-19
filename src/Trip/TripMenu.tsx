import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { Button, DropdownMenu } from '@radix-ui/themes';
import { Link, useLocation } from 'wouter';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { db } from '../data/db';
import type { DbUser } from '../data/types';
import { ROUTES, asRootRoute } from '../routes';
import s from './TripMenu.module.css';

export function TripMenu({
  user,
  setEditTripDialogOpen,
  setShareTripDialogOpen,
  setNewActivityDialogOpen,
  setNewAcommodationDialogOpen,
  setDeleteTripDialogOpen,
  showTripSharing,
}: {
  user: DbUser | null | undefined;
  setEditTripDialogOpen: (v: boolean) => void;
  setShareTripDialogOpen: (v: boolean) => void;
  setNewActivityDialogOpen: (v: boolean) => void;
  setNewAcommodationDialogOpen: (v: boolean) => void;
  setDeleteTripDialogOpen: (v: boolean) => void;
  showTripSharing: boolean;
}) {
  const [, setLocation] = useLocation();
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="outline">
            <HamburgerMenuIcon />
            <span className={s.actionsTitle}>Actions</span>
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
              setEditTripDialogOpen(true);
            }}
          >
            Edit trip
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onClick={() => {
              setNewAcommodationDialogOpen(true);
            }}
          >
            Add accommodation
          </DropdownMenu.Item>

          {showTripSharing ? (
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
              setLocation(asRootRoute(ROUTES.Trips));
            }}
          >
            View trips
          </DropdownMenu.Item>

          <>
            {/* On small screen, account section is under hamburger menu  */}
            <DropdownMenu.Separator className={s.onlyForXs} />
            <DropdownMenu.Label className={s.onlyForXs}>
              Account
            </DropdownMenu.Label>
            <DropdownMenu.Item asChild className={s.onlyForXs}>
              <Link to={`~${ROUTES.Account}`}>Edit account</Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className={s.onlyForXs}
              onClick={() => {
                void db.auth.signOut().then(() => {
                  setLocation(asRootRoute(ROUTES.Login));
                });
              }}
            >
              Log out
            </DropdownMenu.Item>
          </>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <div className={s.userAvatar}>
        {/* On non-small screen, account section is outside hamburger menu  */}
        <UserAvatarMenu user={user} />
      </div>
    </>
  );
}
