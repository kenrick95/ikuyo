import { useCallback } from 'react';
import { AccommodationNewDialog } from '../../Accommodation/AccommodationNewDialog';
import { ActivityNewDialog } from '../../Activity/ActivityNewDialog';
import { FlightNewDialog } from '../../Activity/FlightNewDialog';
import { TrainNewDialog } from '../../Activity/TrainNewDialog';
import { useBoundStore } from '../../data/store';
import { MacroplanNewDialog } from '../../Macroplan/MacroplanNewDialog';
import type { TripSliceTrip } from '../store/types';

export const slotActions = [
  { id: 'activity', label: 'New activity' },
  { id: 'flight', label: 'New flight' },
  { id: 'train', label: 'New train' },
  { id: 'accommodation', label: 'New accommodation' },
  { id: 'macroplan', label: 'New day plan' },
] as const;

export type TimetableAction = (typeof slotActions)[number]['id'];

export type TimetableSlot = {
  dayOfTrip: number;
  timeStart: string;
  instant?: number;
  date?: string;
};

export function useTimetableSlotActions(trip: TripSliceTrip | undefined) {
  const pushDialog = useBoundStore((state) => state.pushDialog);
  return useCallback(
    (action: TimetableAction, prefillData: TimetableSlot) => {
      if (!trip) return;
      switch (action) {
        case 'activity':
          pushDialog(ActivityNewDialog, { trip, prefillData });
          break;
        case 'flight':
          pushDialog(FlightNewDialog, { trip, prefillData });
          break;
        case 'train':
          pushDialog(TrainNewDialog, { trip, prefillData });
          break;
        case 'accommodation':
          pushDialog(AccommodationNewDialog, { trip, prefillData });
          break;
        case 'macroplan':
          pushDialog(MacroplanNewDialog, { trip, prefillData });
          break;
      }
    },
    [trip, pushDialog],
  );
}
