import { Select } from '@radix-ui/themes';
import { TripViewMode } from './TripViewMode';
import { useId } from 'react';

export function TripViewModeSelector({
  mode,
  setMode,
}: {
  mode: TripViewMode;
  setMode: (newMode: TripViewMode) => void;
}) {
  const idMode = useId();
  return (
    <>
      <Select.Root value={mode} onValueChange={setMode}>
        <Select.Trigger id={idMode} style={{ width: '7em' }} />
        <Select.Content>
          <Select.Item value={TripViewMode.Timetable}>Timetable</Select.Item>
          <Select.Item value={TripViewMode.List}>List</Select.Item>
        </Select.Content>
      </Select.Root>
    </>
  );
}
