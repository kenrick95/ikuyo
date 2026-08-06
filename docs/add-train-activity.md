# Add a `train` activity type (full flight parity)

Plan to add a Train activity type, mirroring the existing Flight implementation
end-to-end: flag bitmask, type derivation, TrainForm, TrainNewDialog, edit/view/
delete dialog handling, print export, the new-trip wizard, and "Add Train" entry
points.

## Step-by-step checklist

### 1. Flag bitmask — `src/Activity/activityFlag.ts`
- [ ] Add `IsTrain: 8 as const` (`1 << 3`) next to `IsIdea: 2` and `IsFlight: 4`.

### 2. Type derivation — `src/Activity/activityType.ts`
- [ ] Add `Train: 'train'` to `ActivityType`.
- [ ] `getActivityType`: priority `Flight > Train > Activity`.
- [ ] `applyActivityType`: clear both `IsFlight` and `IsTrain`, set the bit for the chosen type (preserve `IsIdea`).
- [ ] `ActivityTypeLabel`: add `Train: 'Train'`.

### 3. New form — `src/Activity/TrainForm/`
- [ ] Create `TrainForm/TrainForm.tsx` cloned from `FlightForm/FlightForm.tsx` with train labels:
  - title = "Train / service number" (placeholder e.g. `TGV 6181`)
  - "From — departure station", "To — arrival station"
  - notes placeholder ("booking reference, carriage, seat, etc.")
  - force-set `IsTrain` on save (mirror `FlightForm.tsx:372-374`), preserve `IsIdea`
  - default icon `🚆`
- [ ] Create `TrainForm/TrainFormGeocoding.ts` cloned from `FlightForm/FlightFormGeocoding.ts`
  (region-free `types: ['poi']` station search, no airport-specific fallback).

### 4. New dialog — `src/Activity/TrainNewDialog.tsx`
- [ ] Clone `FlightNewDialog.tsx`, render `TrainForm`, `activityIcon="🚆"`, title "New Train".

### 5. Edit-dialog type selector — `src/Activity/ActivityDialog/ActivityDialogContentEdit.tsx`
- [ ] RadioCards `columns="3"` mapping over 3 types (`Activity` / `Flight` / `Train`).
- [ ] Render `TrainForm` when `activityType === Train`; type-specific description strings.

### 6. View — `src/Activity/ActivityDialog/ActivityDialogContentView.tsx`
- [ ] Generalize `isFlight` to a transport check (Flight or Train) for `From` / `To` / `Notes` labels.
- [ ] Extend `typeLabel` to include Train.

### 7. Delete — `src/Activity/ActivityDialog/ActivityDialogContentDelete.tsx`
- [ ] Generalize the "flight" wording to also cover train (use `ActivityTypeLabel` / transport check).

### 8. Print export — `src/Trip/TripMenu/print.ts`
- [ ] In `renderActivity`, treat Train as transport so it renders `Origin → Destination` (mirror lines 101-107).

### 9. New-trip wizard — `src/Trip/TripNew/`
- [ ] `wizardReducer.ts`:
  - Add `TrainCapture` type (same fields as `FlightCapture`, but `trainNumber` / `departureStation` / `arrivalStation`).
  - Widen `travelMode` to `'flight' | 'train' | 'other' | null`.
  - Add `outboundTrain` / `returnTrain` state + `SET_OUTBOUND_TRAIN` / `SET_RETURN_TRAIN` actions.
  - Prefill outbound/return train defaults in step 2→3 reducer (mirror lines 63-112).
- [ ] `wizardUtils.ts`: add `getTrainTimeError` (or generalize `getFlightTimeError`).
- [ ] Create `TrainSubform.tsx` cloned from `FlightSubform.tsx` (station labels + `trainNumber`).
- [ ] `PageTripNew.tsx`:
  - Three travel-mode cards: ✈️ Flying / 🚆 Train (enabled) / 🚌 Other (disabled "Coming soon").
  - Render outbound/return `TrainSubform` when `travelMode === 'train'`.
  - `handleCreateTrip`: outbound/return `dbAddActivity` writing `flags: ActivityFlag.IsTrain`, `icon: '🚆'`.
  - Button enable/disable + "Skip" logic per travel mode.

### 10. "Add Train" entry points
- [ ] `src/Trip/TripTimetableView/TimetableGrid.tsx`: add `openTrainNewDialog` (mirror flight lines 56-74) + "New train" `ContextMenu.Item` (after line 157).
- [ ] `src/Trip/TripMenu/TripMenu.tsx`: add `TrainNewDialog` import + push (mirror line 106).
- [ ] `src/Trip/TripTimetableView/Timetable.tsx`: add `TrainNewDialog` import + push (mirror line 509).
