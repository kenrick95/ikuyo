import type { DateTime } from 'luxon';
import type { ReactNode } from 'react';
import { getTripStatus } from './getTripStatus';
import type { TripSliceTrip } from './store/types';
import styles from './TripHomeLayout.module.css';

export interface TripLayoutProps {
  trip: TripSliceTrip;
  tripStartDateTime?: DateTime;
  tripEndDateTime?: DateTime;
  children: {
    hero: ReactNode;
    primaryContent: ReactNode;
    secondaryContent: ReactNode;
    tertiaryContent?: ReactNode;
  };
}

export function TripHomeLayout({
  trip,
  tripStartDateTime,
  tripEndDateTime,
  children,
}: TripLayoutProps) {
  const tripStatus =
    tripStartDateTime && tripEndDateTime
      ? getTripStatus(tripStartDateTime, tripEndDateTime)
      : null;

  // Determine layout based on trip content and status
  const hasActivities = (trip.activityIds?.length || 0) > 0;
  const hasAccommodations = (trip.accommodationIds?.length || 0) > 0;
  const isNewTrip = !hasActivities && !hasAccommodations;
  const isDuringTrip = tripStatus?.status === 'current';

  if (isNewTrip) {
    return (
      <TripLayoutNewTrip>
        {children.hero}
        {children.primaryContent}
        {children.secondaryContent}
      </TripLayoutNewTrip>
    );
  }

  if (isDuringTrip) {
    return (
      <TripLayoutDuringTrip>
        {children.hero}
        {children.primaryContent}
        {children.secondaryContent}
        {children.tertiaryContent}
      </TripLayoutDuringTrip>
    );
  }

  // Default: Pre-trip or past trip
  return (
    <TripLayoutDefault>
      {children.hero}
      {children.primaryContent}
      {children.secondaryContent}
      {children.tertiaryContent}
    </TripLayoutDefault>
  );
}

function TripLayoutNewTrip({ children }: { children: ReactNode[] }) {
  return (
    <>
      {/* Hero section */}
      {children[0]}

      {/* Single column layout for getting started */}
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {children[1]}
        {children[2]}
      </div>
    </>
  );
}

function TripLayoutDuringTrip({ children }: { children: ReactNode[] }) {
  return (
    <>
      {/* Hero section */}
      {children[0]}

      {/* During trip: Today's schedule takes priority */}
      <div className={styles.tripLayoutDuringTrip}>
        <div>
          {/* Primary: Today's schedule and urgent tasks */}
          {children[1]}
        </div>
        <div>
          {/* Secondary: Upcoming activities, quick actions */}
          {children[2]}
        </div>
      </div>

      {/* Tertiary: Less important info, collapsible */}
      {children[3] && (
        <details style={{ marginTop: '2rem' }}>
          <summary>Trip Details & Statistics</summary>
          {children[3]}
        </details>
      )}
    </>
  );
}

function TripLayoutDefault({ children }: { children: ReactNode[] }) {
  return (
    <>
      {/* Hero section */}
      {children[0]}

      {/* Pre-trip: Balanced layout */}
      <div className={styles.tripLayoutDefault}>
        <div>{children[1]}</div>
        <div>{children[2]}</div>
      </div>

      {children[3]}
    </>
  );
}
