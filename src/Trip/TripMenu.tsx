import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { Button, DropdownMenu } from '@radix-ui/themes';
import { Link, useLocation } from 'wouter';
import { AccommodationNewDialog } from '../Accommodation/AccommodationNewDialog';
import { ActivityNewDialog } from '../Activity/ActivityNewDialog';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { MacroplanNewDialog } from '../Macroplan/MacroplanNewDialog';
import { db } from '../data/db';
import { useBoundStore } from '../data/store';
import type { DbUser } from '../data/types';
import { ROUTES, asRootRoute } from '../Routes/routes';
import { TripDeleteDialog } from './TripDeleteDialog';
import { TripEditDialog } from './TripEditDialog';
import s from './TripMenu.module.css';
import { TripSharingDialog } from './TripSharingDialog';
import type { DbTripFull } from './db';

export function TripMenu({
  trip,
  user,
  showTripSharing,
}: {
  trip: DbTripFull | undefined;
  user: DbUser | null | undefined;
  showTripSharing: boolean;
}) {
  const [, setLocation] = useLocation();
  const pushDialog = useBoundStore((state) => state.pushDialog);
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
              if (trip) {
                pushDialog(ActivityNewDialog, { trip });
              }
            }}
          >
            New activity
          </DropdownMenu.Item>

          <DropdownMenu.Separator />
          <DropdownMenu.Label>Trip</DropdownMenu.Label>

          <DropdownMenu.Item
            onClick={() => {
              if (trip) {
                pushDialog(TripEditDialog, { trip });
              }
            }}
          >
            Edit trip
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onClick={() => {
              if (trip) {
                pushDialog(AccommodationNewDialog, { trip });
              }
            }}
          >
            Add accommodation
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onClick={() => {
              if (trip) {
                pushDialog(MacroplanNewDialog, { trip });
              }
            }}
          >
            Add day plan
          </DropdownMenu.Item>

          {showTripSharing ? (
            <DropdownMenu.Item
              onClick={() => {
                if (trip && user) {
                  pushDialog(TripSharingDialog, { trip, user });
                }
              }}
            >
              Share trip
            </DropdownMenu.Item>
          ) : null}

          <DropdownMenu.Item
            onClick={() => {
              if (trip) {
                pushDialog(TripDeleteDialog, { trip });
              }
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
