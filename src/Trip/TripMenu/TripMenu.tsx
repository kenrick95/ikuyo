import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { Button, DropdownMenu, Flex } from '@radix-ui/themes';
import { useCallback, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { AccommodationNewDialog } from '../../Accommodation/AccommodationNewDialog';
import { ActivityNewDialog } from '../../Activity/ActivityNewDialog';
import { FlightNewDialog } from '../../Activity/FlightNewDialog';
import { activitiesToIcs, downloadIcs } from '../../Activity/icsExport';
import { useCurrentUser } from '../../Auth/hooks';
import { UserAvatarMenu } from '../../Auth/UserAvatarMenu';
import { db } from '../../data/db';
import { useBoundStore } from '../../data/store';
import { MacroplanNewDialog } from '../../Macroplan/MacroplanNewDialog';
import { RouteAccount, RouteLogin, RouteTrips } from '../../Routes/routes';
import { TripUserRole } from '../../User/TripUserRole';
import { useCurrentTrip } from '../store/hooks';
import { TripDeleteDialog } from '../TripDialog/TripDeleteDialog';
import { TripEditDialog } from '../TripDialog/TripEditDialog';
import { TripSharingDialog } from '../TripDialog/TripSharingDialog';
import { printTrip, tripToHtml } from './print';
import s from './TripMenu.module.css';

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

  const handlePrintTrip = useCallback(
    () => {
      const state = useBoundStore.getState();
      const currentTripId = state.currentTripId;
      if (!currentTripId) return;
      const trip = state.trip[currentTripId];
      if (!trip) return;
      const activities = state.getActivities(trip.activityIds);
      const accommodations = state.getAccommodations(trip.accommodationIds);
      const macroplans = state.getMacroplans(trip.macroplanIds);
      const html = tripToHtml(trip, activities, accommodations, macroplans);
      printTrip(html);
    },
    [
      // Instead of depending on 'trip' and 'activites' etc as a dependency, we read the latest activities directly from the store when the handler is invoked. This reduce need for component re-render
    ],
  );

  const handleExportToIcs = useCallback(
    () => {
      const state = useBoundStore.getState();
      const currentTripId = state.currentTripId;
      if (!currentTripId) return;
      const trip = state.trip[currentTripId];
      if (!trip) return;
      const activities = state.getActivities(trip.activityIds);
      const icsContent = activitiesToIcs(activities, trip.timeZone, trip.title);
      if (!icsContent) return;

      const filename = `${trip.title.replace(/[^a-z0-9]/gi, '_')}_activities_${new Date().toISOString().split('T')[0]}.ics`;
      downloadIcs(icsContent, filename);
    },
    [
      // Similar to handlePrintTrip, we read the latest activities directly from the store when the handler is invoked, to avoid unnecessary re-renders
    ],
  );
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
          <DropdownMenu.Item
            disabled={!userCanModifyTrip}
            onClick={
              userCanModifyTrip
                ? () => {
                    if (trip) {
                      pushDialog(FlightNewDialog, { trip });
                    }
                  }
                : undefined
            }
          >
            New flight
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
            disabled={!userIsOwner || !user?.email}
            onClick={
              userIsOwner && user?.email
                ? () => {
                    if (trip && user) {
                      pushDialog(TripSharingDialog, { tripId: trip.id });
                    }
                  }
                : undefined
            }
          >
            Sharing & privacy
          </DropdownMenu.Item>

          <DropdownMenu.Item onClick={handleExportToIcs}>
            Export activities to ICS
          </DropdownMenu.Item>

          <DropdownMenu.Item onClick={handlePrintTrip}>
            Print trip
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

          {/* Help */}
          <DropdownMenu.Separator className={s.onlyForXs} />
          <DropdownMenu.Label className={s.onlyForXs}>
            Others
          </DropdownMenu.Label>
          <DropdownMenu.Item asChild>
            <a
              href="https://blog.kenrick95.org/2025/06/ikuyo-plan-your-next-trip/#respond"
              target="_blank"
              rel="noopener noreferrer"
              className={s.onlyForXs}
            >
              Feedback
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <a
              href="https://github.com/kenrick95/ikuyo"
              target="_blank"
              rel="noopener noreferrer"
              className={s.onlyForXs}
            >
              Source Code (GitHub)
            </a>
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
