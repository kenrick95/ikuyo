import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { Button, DropdownMenu, Flex } from '@radix-ui/themes';
import { useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { AccommodationNewDialog } from '../Accommodation/AccommodationNewDialog';
import { ActivityNewDialog } from '../Activity/ActivityNewDialog';
import { useCurrentUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { db } from '../data/db';
import { useBoundStore } from '../data/store';
import { TripUserRole } from '../data/TripUserRole';
import { MacroplanNewDialog } from '../Macroplan/MacroplanNewDialog';
import { RouteAccount, RouteLogin, RouteTrips } from '../Routes/routes';
import { useCurrentTrip } from './store/hooks';
import { TripDeleteDialog } from './TripDeleteDialog';
import { TripEditDialog } from './TripEditDialog';
import s from './TripMenu.module.css';
import { TripSharingDialog } from './TripSharingDialog';

export function TripMenu() {
  const [, setLocation] = useLocation();
  const { trip } = useCurrentTrip();
  const user = useCurrentUser();
  const userIsOwner = useMemo(() => {
    return trip?.currentUserRole === TripUserRole.Owner;
  }, [trip?.currentUserRole]);
  const userCanModifyTrip = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);
  const pushDialog = useBoundStore((state) => state.pushDialog);
  return (
    <Flex className={s.tripMenu} align="center">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className={s.hamburgerMenuTrigger}>
          <Button variant="outline">
            <HamburgerMenuIcon />
            <span className={s.actionsTitle}>Actions</span>
            <DropdownMenu.TriggerIcon />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Label>Activity</DropdownMenu.Label>
          <DropdownMenu.Item
            disabled={!userCanModifyTrip}
            onClick={
              userCanModifyTrip
                ? () => {
                    if (trip) {
                      pushDialog(ActivityNewDialog, { trip });
                    }
                  }
                : undefined
            }
          >
            New activity
          </DropdownMenu.Item>

          <DropdownMenu.Separator />
          <DropdownMenu.Label>Trip</DropdownMenu.Label>

          <DropdownMenu.Item
            disabled={!userCanModifyTrip}
            onClick={
              userCanModifyTrip
                ? () => {
                    if (trip) {
                      pushDialog(TripEditDialog, { trip });
                    }
                  }
                : undefined
            }
          >
            Edit trip
          </DropdownMenu.Item>

          <DropdownMenu.Item
            disabled={!userCanModifyTrip}
            onClick={
              userCanModifyTrip
                ? () => {
                    if (trip) {
                      pushDialog(AccommodationNewDialog, { trip });
                    }
                  }
                : undefined
            }
          >
            Add accommodation
          </DropdownMenu.Item>

          <DropdownMenu.Item
            disabled={!userCanModifyTrip}
            onClick={
              userCanModifyTrip
                ? () => {
                    if (trip) {
                      pushDialog(MacroplanNewDialog, { trip });
                    }
                  }
                : undefined
            }
          >
            Add day plan
          </DropdownMenu.Item>

          <DropdownMenu.Item
            disabled={!userIsOwner}
            onClick={
              userIsOwner
                ? () => {
                    if (trip && user) {
                      pushDialog(TripSharingDialog, { tripId: trip.id });
                    }
                  }
                : undefined
            }
          >
            Share trip
          </DropdownMenu.Item>

          <DropdownMenu.Item
            disabled={!userCanModifyTrip}
            onClick={
              userCanModifyTrip
                ? () => {
                    if (trip) {
                      pushDialog(TripDeleteDialog, { trip });
                    }
                  }
                : undefined
            }
          >
            Delete trip
          </DropdownMenu.Item>

          <DropdownMenu.Separator />
          <DropdownMenu.Label>Trips</DropdownMenu.Label>
          <DropdownMenu.Item
            onClick={() => {
              setLocation(RouteTrips.asRootRoute());
            }}
          >
            View trips
          </DropdownMenu.Item>

          {/* On small screen, account section is under hamburger menu  */}
          <DropdownMenu.Separator className={s.onlyForXs} />
          <DropdownMenu.Label className={s.onlyForXs}>
            Account
          </DropdownMenu.Label>
          <DropdownMenu.Item asChild className={s.onlyForXs}>
            <Link to={RouteAccount.asRootRoute()}>Edit account</Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={s.onlyForXs}
            onClick={() => {
              void db.auth.signOut().then(() => {
                setLocation(RouteLogin.asRootRoute());
              });
            }}
          >
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <div className={s.userAvatar}>
        {/* On non-small screen, account section is outside hamburger menu  */}
        <UserAvatarMenu user={user} />
      </div>
    </Flex>
  );
}
