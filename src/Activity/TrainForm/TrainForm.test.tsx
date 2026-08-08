import { Theme } from '@radix-ui/themes';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ActivityFormMode } from '../ActivityForm/ActivityFormMode';
import { ActivityFlag } from '../activityFlag';
import { dbAddActivity, dbUpdateActivity } from '../db';
import { TrainForm } from './TrainForm';

// Wrapper component to provide Theme context
function TestWrapper({ children }: { children: ReactNode }) {
  return <Theme>{children}</Theme>;
}

// Custom render function that includes Theme provider
function renderWithTheme(ui: ReactElement) {
  return render(ui, { wrapper: TestWrapper });
}

// Mock the dependencies
vi.mock('../../data/store', () => {
  const store = {
    publishToast: vi.fn(),
    setTripLocalState: vi.fn(),
  };
  return {
    useBoundStore: vi.fn(
      (selector: ((state: typeof store) => unknown) | undefined) =>
        selector ? selector(store) : store,
    ),
  };
});

vi.mock('../db', () => ({
  dbAddActivity: vi.fn(),
  dbUpdateActivity: vi.fn(),
}));

vi.mock('./TrainFormGeocoding', () => ({
  stationGeocodingRequest: vi.fn(() => Promise.resolve([0, 0, 9])),
}));

vi.mock('../ActivityDialog/ActivityDialogMap', () => ({
  ActivityMap: () => <div data-testid="activity-map">Map</div>,
}));

describe('TrainForm', () => {
  const baseProps = {
    mode: ActivityFormMode.New,
    tripId: 'trip-1',
    tripStartDateTime: Temporal.PlainDate.from('2024-09-23T00:00:00'),
    tripEndDateTime: Temporal.PlainDate.from('2024-09-25T23:59:59'),
    tripTimeZone: 'UTC',
    tripRegion: 'FR',
    activityTitle: '',
    activityStartDateTime: undefined,
    activityEndDateTime: undefined,
    activityStartTimeZone: 'UTC',
    activityEndTimeZone: 'UTC',
    activityLocation: '',
    activityLocationLat: null,
    activityLocationLng: null,
    activityLocationZoom: null,
    activityLocationDestination: null,
    activityLocationDestinationLat: null,
    activityLocationDestinationLng: null,
    activityLocationDestinationZoom: null,
    activityDescription: '',
    activityFlags: 0,
    onFormSuccess: vi.fn(),
    onFormCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(dbAddActivity).mockReset();
    vi.mocked(dbUpdateActivity).mockReset();
  });

  test('renders the train-specific labels', () => {
    renderWithTheme(<TrainForm {...baseProps} />);
    expect(
      screen.getByText(/Train number or service number or line name/),
    ).toBeDefined();
    expect(screen.getByText(/Departure station/)).toBeDefined();
    expect(screen.getByText(/Arrival station/)).toBeDefined();
    expect(screen.getByText(/Is this train journey an idea/)).toBeDefined();
  });

  test('required stations block submission without calling dbAddActivity', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <TrainForm
        {...baseProps}
        activityTitle="TGV 6181"
        activityStartDateTime={Temporal.PlainDateTime.from('2024-09-23T09:00')}
        activityEndDateTime={Temporal.PlainDateTime.from('2024-09-23T12:00')}
      />,
    );

    // Fill the title but leave stations empty
    const titleInput = screen.getByDisplayValue('TGV 6181');
    expect(titleInput).toBeDefined();
    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(dbAddActivity).not.toHaveBeenCalled();
    });
    expect(dbUpdateActivity).not.toHaveBeenCalled();
  });

  test('arrival time before departure time shows an error', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <TrainForm
        {...baseProps}
        activityTitle="TGV 6181"
        activityLocation="Paris Gare de Lyon"
        activityLocationDestination="Marseille Saint-Charles"
        activityStartDateTime={Temporal.PlainDateTime.from('2024-09-23T12:00')}
        activityEndDateTime={Temporal.PlainDateTime.from('2024-09-23T09:00')}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText('Arrival time must be after departure time'),
      ).toBeDefined();
    });
    expect(dbAddActivity).not.toHaveBeenCalled();
  });

  test('departure before trip start shows an error', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <TrainForm
        {...baseProps}
        activityTitle="TGV 6181"
        activityLocation="Paris Gare de Lyon"
        activityLocationDestination="Marseille Saint-Charles"
        activityStartDateTime={Temporal.PlainDateTime.from('2024-09-20T09:00')}
        activityEndDateTime={Temporal.PlainDateTime.from('2024-09-20T12:00')}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Departure time cannot be earlier than 1 day before trip start',
        ),
      ).toBeDefined();
    });
    expect(dbAddActivity).not.toHaveBeenCalled();
  });

  test('new submit adds an activity with IsTrain flag and coordinates', async () => {
    const user = userEvent.setup();
    const onFormSuccess = vi.fn();
    renderWithTheme(
      <TrainForm
        {...baseProps}
        activityTitle="TGV 6181"
        activityLocation="Paris Gare de Lyon"
        activityLocationDestination="Marseille Saint-Charles"
        activityLocationLat={48.84}
        activityLocationLng={2.37}
        activityLocationZoom={9}
        activityLocationDestinationLat={43.3}
        activityLocationDestinationLng={5.37}
        activityLocationDestinationZoom={8}
        activityStartDateTime={Temporal.PlainDateTime.from('2024-09-23T09:00')}
        activityEndDateTime={Temporal.PlainDateTime.from('2024-09-23T12:00')}
        activityStartTimeZone="Europe/Paris"
        activityEndTimeZone="Europe/Paris"
        onFormSuccess={onFormSuccess}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(dbAddActivity).toHaveBeenCalledTimes(1);
    });
    const payload = vi.mocked(dbAddActivity).mock.calls[0][0];
    expect(payload).toMatchObject({
      title: 'TGV 6181',
      location: 'Paris Gare de Lyon',
      locationDestination: 'Marseille Saint-Charles',
      locationLat: 48.84,
      locationLng: 2.37,
      locationZoom: 9,
      locationDestinationLat: 43.3,
      locationDestinationLng: 5.37,
      locationDestinationZoom: 8,
      flags: ActivityFlag.IsTrain,
    });
    expect((payload.flags ?? 0) & ActivityFlag.IsTrain).toBe(
      ActivityFlag.IsTrain,
    );
    expect(onFormSuccess).toHaveBeenCalled();
  });

  test('new submit with isIdea sets IsTrain and IsIdea flags', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <TrainForm
        {...baseProps}
        activityTitle="TGV 6181"
        activityLocation="Paris Gare de Lyon"
        activityLocationDestination="Marseille Saint-Charles"
        activityStartDateTime={Temporal.PlainDateTime.from('2024-09-23T09:00')}
        activityEndDateTime={Temporal.PlainDateTime.from('2024-09-23T12:00')}
        activityFlags={0}
      />,
    );

    const ideaSwitch = screen.getByRole('switch', {
      name: /is this train journey an idea/i,
    });
    await user.click(ideaSwitch);
    expect(ideaSwitch).toBeChecked();

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(dbAddActivity).toHaveBeenCalledTimes(1);
    });
    const payload = vi.mocked(dbAddActivity).mock.calls[0][0];
    expect((payload.flags ?? 0) & ActivityFlag.IsTrain).toBe(
      ActivityFlag.IsTrain,
    );
    expect((payload.flags ?? 0) & ActivityFlag.IsIdea).toBe(
      ActivityFlag.IsIdea,
    );
  });

  test('edit submit updates the activity preserving IsTrain', async () => {
    const user = userEvent.setup();
    const onFormSuccess = vi.fn();
    renderWithTheme(
      <TrainForm
        {...baseProps}
        mode={ActivityFormMode.Edit}
        activityId="activity-1"
        activityTitle="TGV 900"
        activityLocation="Paris Gare de Lyon"
        activityLocationDestination="Marseille Saint-Charles"
        activityLocationLat={48.84}
        activityLocationLng={2.37}
        activityLocationZoom={9}
        activityLocationDestinationLat={43.3}
        activityLocationDestinationLng={5.37}
        activityLocationDestinationZoom={8}
        activityStartDateTime={Temporal.PlainDateTime.from('2024-09-23T09:00')}
        activityEndDateTime={Temporal.PlainDateTime.from('2024-09-23T12:00')}
        activityStartTimeZone="Europe/Paris"
        activityEndTimeZone="Europe/Paris"
        activityFlags={ActivityFlag.IsTrain}
        onFormSuccess={onFormSuccess}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);

    await waitFor(() => {
      expect(dbUpdateActivity).toHaveBeenCalledTimes(1);
    });
    const payload = vi.mocked(dbUpdateActivity).mock.calls[0][0];
    expect(payload.id).toBe('activity-1');
    expect(payload).toMatchObject({
      title: 'TGV 900',
      location: 'Paris Gare de Lyon',
      locationDestination: 'Marseille Saint-Charles',
      locationLat: 48.84,
      locationLng: 2.37,
      locationDestinationLat: 43.3,
      locationDestinationLng: 5.37,
      flags: ActivityFlag.IsTrain,
    });
    expect((payload.flags ?? 0) & ActivityFlag.IsTrain).toBe(
      ActivityFlag.IsTrain,
    );
    expect(onFormSuccess).toHaveBeenCalled();
  });
});
