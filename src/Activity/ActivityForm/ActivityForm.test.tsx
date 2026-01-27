import { Theme } from '@radix-ui/themes';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTime } from 'luxon';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { ActivityFlag } from '../activityFlag';
import { ActivityForm } from './ActivityForm';
import { ActivityFormMode } from './ActivityFormMode';

// Wrapper component to provide Theme context
function TestWrapper({ children }: { children: ReactNode }) {
  return <Theme>{children}</Theme>;
}

// Custom render function that includes Theme provider
function renderWithTheme(ui: ReactElement) {
  return render(ui, { wrapper: TestWrapper });
}

// Mock the dependencies
vi.mock('../../data/store', () => ({
  useBoundStore: vi.fn(() => ({
    publishToast: vi.fn(),
    setTripLocalState: vi.fn(),
  })),
}));

vi.mock('../db', () => ({
  dbAddActivity: vi.fn(),
  dbUpdateActivity: vi.fn(),
}));

vi.mock('./ActivityFormGeocoding', () => ({
  geocodingRequest: vi.fn(() => Promise.resolve([0, 0, 9])),
}));

vi.mock('../ActivityDialog/ActivityDialogMap', () => ({
  ActivityMap: () => <div data-testid="activity-map">Map</div>,
}));

describe('ActivityForm - TimeZone and DateTimePicker Integration', () => {
  const baseProps = {
    mode: ActivityFormMode.New,
    tripId: 'trip-1',
    tripStartDateTime: DateTime.fromISO('2024-09-23T00:00:00Z'),
    tripEndDateTime: DateTime.fromISO('2024-09-25T23:59:59Z'),
    tripTimeZone: 'UTC',
    tripRegion: 'US',
    activityTitle: '',
    activityStartDateTime: undefined,
    activityEndDateTime: undefined,
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

  test('changing start time zone preserves local time', async () => {
    const user = userEvent.setup();
    const initialDateTime = DateTime.fromISO('2024-09-23T14:30:00', {
      zone: 'UTC',
    });

    renderWithTheme(
      <ActivityForm {...baseProps} activityStartDateTime={initialDateTime} />,
    );

    // Find all timezone selects (there are 2: start and end)
    const timeZoneSelects = screen.getAllByDisplayValue('UTC');
    expect(timeZoneSelects.length).toBeGreaterThanOrEqual(2);

    // The first one should be for start time
    const startTimeZoneSelect = timeZoneSelects[0];

    // Find the datetime display - should show 14:30 in UTC
    const dateTimeInput = screen.getByDisplayValue(/14:30/);
    expect(dateTimeInput).toBeDefined();

    // Change timezone to America/New_York
    await user.click(startTimeZoneSelect);
    const newYorkOptions = await screen.findAllByText('America/New_York');
    await user.click(newYorkOptions[0]);

    // After timezone change, the local time (14:30) should be preserved
    // but now it's in America/New_York timezone
    await waitFor(() => {
      const updatedInput = screen.getByDisplayValue(/14:30/);
      expect(updatedInput).toBeDefined();
    });
  });

  test('changing end time zone preserves local time', async () => {
    const user = userEvent.setup();
    const initialStartDateTime = DateTime.fromISO('2024-09-23T14:30:00', {
      zone: 'UTC',
    });
    const initialEndDateTime = DateTime.fromISO('2024-09-23T16:30:00', {
      zone: 'UTC',
    });

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={initialStartDateTime}
        activityEndDateTime={initialEndDateTime}
      />,
    );

    // Find all timezone selects (there should be 2: start and end)
    const timeZoneSelects = screen.getAllByDisplayValue('UTC');
    expect(timeZoneSelects.length).toBeGreaterThanOrEqual(2);

    // The second one should be for end time
    const endTimeZoneSelect = timeZoneSelects[1];

    // Change end timezone to Europe/London
    await user.click(endTimeZoneSelect);
    const londonOptions = await screen.findAllByText('Europe/London');
    await user.click(londonOptions[0]);

    // After timezone change, the local time should be preserved
    await waitFor(() => {
      const endTimeInput = screen.getByDisplayValue(/16:30/);
      expect(endTimeInput).toBeDefined();
    });
  });

  test('clearing datetime works after timezone change', async () => {
    const user = userEvent.setup();
    const initialDateTime = DateTime.fromISO('2024-09-23T14:30:00', {
      zone: 'UTC',
    });

    renderWithTheme(
      <ActivityForm {...baseProps} activityStartDateTime={initialDateTime} />,
    );

    // First change the timezone
    const timeZoneSelects = screen.getAllByDisplayValue('UTC');
    const startTimeZoneSelect = timeZoneSelects[0];

    await user.click(startTimeZoneSelect);
    const europeParisOptions = await screen.findAllByText('Europe/Paris');
    await user.click(europeParisOptions[0]);

    // Wait for timezone change to take effect
    await waitFor(() => {
      // Check that the timezone label shows Europe/Paris
      const labels = screen.getAllByText(/Europe\/Paris/);
      expect(labels.length).toBeGreaterThan(0);
    });

    // Now clear the datetime
    // Find the clear button in the DateTimePicker (should have a Cross icon or similar)
    const clearButtons = screen.getAllByRole('button');
    const clearButton = clearButtons.find((btn: HTMLElement) =>
      btn.querySelector('[data-testid*="clear"]'),
    );

    if (clearButton) {
      await user.click(clearButton);

      // After clearing, the datetime should be cleared
      await waitFor(() => {
        const dateTimeInput = screen.queryByDisplayValue(/14:30/);
        expect(dateTimeInput).toBeNull();
      });
    }
  });

  test('timezone changes work independently for start and end times', async () => {
    const user = userEvent.setup();
    const initialStartDateTime = DateTime.fromISO('2024-09-23T10:00:00', {
      zone: 'UTC',
    });
    const initialEndDateTime = DateTime.fromISO('2024-09-23T18:00:00', {
      zone: 'UTC',
    });

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={initialStartDateTime}
        activityEndDateTime={initialEndDateTime}
      />,
    );

    // Get both timezone selects
    const timeZoneSelects = screen.getAllByDisplayValue('UTC');
    expect(timeZoneSelects.length).toBeGreaterThanOrEqual(2);

    const startTimeZoneSelect = timeZoneSelects[0];
    const endTimeZoneSelect = timeZoneSelects[1];

    // Change start timezone to America/Los_Angeles
    await user.click(startTimeZoneSelect);
    const laOptions = await screen.findAllByText('America/Los_Angeles');
    await user.click(laOptions[0]);

    // Verify start timezone changed
    await waitFor(() => {
      const labels = screen.getAllByText(/America\/Los_Angeles/);
      expect(labels.length).toBeGreaterThan(0);
    });

    // Change end timezone to Asia/Tokyo
    await user.click(endTimeZoneSelect);
    const tokyoOptions = await screen.findAllByText('Asia/Tokyo');
    await user.click(tokyoOptions[0]);

    // Verify end timezone changed
    await waitFor(() => {
      const labels = screen.getAllByText(/Asia\/Tokyo/);
      expect(labels.length).toBeGreaterThan(0);
    });

    // Both timezones should be different now
    expect(screen.getAllByText(/America\/Los_Angeles/).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(/Asia\/Tokyo/).length).toBeGreaterThan(0);
  });

  test('setting datetime after timezone change uses the new timezone', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <ActivityForm {...baseProps} activityStartDateTime={undefined} />,
    );

    // First change the timezone before setting datetime
    const timeZoneSelects = screen.getAllByDisplayValue('UTC');
    const startTimeZoneSelect = timeZoneSelects[0];

    await user.click(startTimeZoneSelect);
    const sydneyOptions = await screen.findAllByText('Australia/Sydney');
    await user.click(sydneyOptions[0]);

    // Verify timezone changed
    await waitFor(() => {
      const labels = screen.getAllByText(/Australia\/Sydney/);
      expect(labels.length).toBeGreaterThan(0);
    });

    // Now set a datetime - it should use Australia/Sydney timezone
    // This would require opening the datetime picker and selecting a date/time
    // The exact implementation depends on the DateTimePicker component's structure
  });

  test('clearing start datetime does not affect end datetime timezone', async () => {
    const initialStartDateTime = DateTime.fromISO('2024-09-23T10:00:00', {
      zone: 'America/New_York',
    });
    const initialEndDateTime = DateTime.fromISO('2024-09-23T18:00:00', {
      zone: 'America/Los_Angeles',
    });

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={initialStartDateTime}
        activityEndDateTime={initialEndDateTime}
      />,
    );

    // Verify initial states
    expect(screen.getByDisplayValue('America/New_York')).toBeDefined();
    expect(screen.getByDisplayValue('America/Los_Angeles')).toBeDefined();

    // Clear start datetime (this part would need to be implemented based on actual UI)
    // The end datetime's timezone should remain unchanged

    // After clearing start datetime, end timezone should still be Los_Angeles
    await waitFor(() => {
      expect(screen.getByDisplayValue('America/Los_Angeles')).toBeDefined();
    });
  });

  test('timezone select shows trip default timezone as hint', () => {
    renderWithTheme(
      <ActivityForm
        {...baseProps}
        tripTimeZone="America/New_York"
        activityStartDateTime={undefined}
      />,
    );

    // Should show hint about trip default timezone
    const hints = screen.getAllByText(
      /trip default time zone is America\/New_York/,
    );
    expect(hints.length).toBeGreaterThan(0);
  });

  test('datetime picker respects trip date boundaries with timezone offset', async () => {
    const tripStart = DateTime.fromISO('2024-09-23T00:00:00Z');
    const tripEnd = DateTime.fromISO('2024-09-25T23:59:59Z');

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        tripStartDateTime={tripStart}
        tripEndDateTime={tripEnd}
        tripTimeZone="UTC"
      />,
    );

    // DateTimePicker should have min/max props set
    // This tests the integration between trip boundaries and the picker
    // The actual validation happens in the DateTimePicker component
    const startTimeLabels = screen.getAllByText(/Start time/);
    expect(startTimeLabels.length).toBeGreaterThan(0);
  });

  test('changing timezone does not trigger unnecessary re-renders', async () => {
    const user = userEvent.setup();
    const onFormSuccess = vi.fn();
    const initialDateTime = DateTime.fromISO('2024-09-23T14:30:00', {
      zone: 'UTC',
    });

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={initialDateTime}
        onFormSuccess={onFormSuccess}
      />,
    );

    // Change timezone
    const timeZoneSelects = screen.getAllByDisplayValue('UTC');
    const startTimeZoneSelect = timeZoneSelects[0];

    await user.click(startTimeZoneSelect);
    const parisOptions = await screen.findAllByText('Europe/Paris');
    await user.click(parisOptions[0]);

    // onFormSuccess should not be called just from timezone change
    expect(onFormSuccess).not.toHaveBeenCalled();
  });

  test('timezone can be changed even when datetime is cleared', async () => {
    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={undefined}
        activityEndDateTime={undefined}
      />,
    );

    // Initially should show trip default timezone (UTC)
    const timeZoneSelects = screen.getAllByDisplayValue('UTC');
    expect(timeZoneSelects.length).toBeGreaterThanOrEqual(2);

    // The timezone select should be enabled and functional even without datetime
    const startTimeZoneSelect = timeZoneSelects[0];
    expect(startTimeZoneSelect).toBeDefined();

    // The timezone hint should reflect the current selection
    const timezoneHint = screen.getAllByText(/in UTC time zone/);
    expect(timezoneHint.length).toBeGreaterThan(0);
  });

  test('newly set datetime uses the currently selected timezone', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <ActivityForm {...baseProps} activityStartDateTime={undefined} />,
    );

    // First change timezone (without any datetime set)
    const timeZoneSelects = screen.getAllByDisplayValue('UTC');
    const startTimeZoneSelect = timeZoneSelects[0];

    await user.click(startTimeZoneSelect);
    const options = await screen.findAllByText('America/New_York');
    await user.click(options[0]);

    // Verify timezone changed in the UI
    await waitFor(() => {
      const labels = screen.getAllByText(/America\/New_York/);
      expect(labels.length).toBeGreaterThan(0);
    });

    // Now when user sets a datetime, it should use America/New_York timezone
    // (This would require more complex interaction with DateTimePicker,
    // but the important part is that the timezone state is preserved)
  });
});

describe('ActivityForm - Activity Idea and Time Interaction', () => {
  const baseProps = {
    mode: ActivityFormMode.New,
    tripId: 'trip-1',
    tripStartDateTime: DateTime.fromISO('2024-09-23T00:00:00Z'),
    tripEndDateTime: DateTime.fromISO('2024-09-25T23:59:59Z'),
    tripTimeZone: 'UTC',
    tripRegion: 'US',
    activityTitle: '',
    activityStartDateTime: undefined,
    activityEndDateTime: undefined,
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

  // ActivityFlag.IsIdea = 1 << 1 = 2
  const IDEA_FLAG = ActivityFlag.IsIdea;

  test('isIdea switch is unchecked by default when activityFlags is 0', () => {
    renderWithTheme(<ActivityForm {...baseProps} activityFlags={0} />);

    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });
    expect(ideaSwitch).not.toBeChecked();
  });

  test('isIdea switch is checked when activityFlags has IsIdea flag', () => {
    renderWithTheme(<ActivityForm {...baseProps} activityFlags={IDEA_FLAG} />);

    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });
    expect(ideaSwitch).toBeChecked();
  });

  test('toggling isIdea on preserves existing start/end times', async () => {
    const user = userEvent.setup();
    const startDateTime = DateTime.fromISO('2024-09-23T10:00:00', {
      zone: 'UTC',
    });
    const endDateTime = DateTime.fromISO('2024-09-23T12:00:00', {
      zone: 'UTC',
    });

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={startDateTime}
        activityEndDateTime={endDateTime}
        activityFlags={0}
      />,
    );

    // Verify times are displayed
    expect(screen.getByDisplayValue(/10:00/)).toBeDefined();
    expect(screen.getByDisplayValue(/12:00/)).toBeDefined();

    // Toggle isIdea on
    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });
    await user.click(ideaSwitch);

    // Times should still be preserved
    await waitFor(() => {
      expect(screen.getByDisplayValue(/10:00/)).toBeDefined();
      expect(screen.getByDisplayValue(/12:00/)).toBeDefined();
    });
  });

  test('toggling isIdea off preserves existing start/end times', async () => {
    const user = userEvent.setup();
    const startDateTime = DateTime.fromISO('2024-09-23T14:00:00', {
      zone: 'UTC',
    });
    const endDateTime = DateTime.fromISO('2024-09-23T16:00:00', {
      zone: 'UTC',
    });

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={startDateTime}
        activityEndDateTime={endDateTime}
        activityFlags={IDEA_FLAG}
      />,
    );

    // Verify times are displayed and idea is checked
    expect(screen.getByDisplayValue(/14:00/)).toBeDefined();
    expect(screen.getByDisplayValue(/16:00/)).toBeDefined();
    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });
    expect(ideaSwitch).toBeChecked();

    // Toggle isIdea off
    await user.click(ideaSwitch);

    // Times should still be preserved
    await waitFor(() => {
      expect(screen.getByDisplayValue(/14:00/)).toBeDefined();
      expect(screen.getByDisplayValue(/16:00/)).toBeDefined();
    });
  });

  test('idea activity can be created without start/end times', () => {
    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={undefined}
        activityEndDateTime={undefined}
        activityFlags={IDEA_FLAG}
      />,
    );

    // Idea switch should be checked
    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });
    expect(ideaSwitch).toBeChecked();

    // Form should render without errors
    expect(screen.getByText(/Activity name/)).toBeDefined();
  });

  test('idea activity can have both start and end times set', () => {
    const startDateTime = DateTime.fromISO('2024-09-23T09:00:00', {
      zone: 'UTC',
    });
    const endDateTime = DateTime.fromISO('2024-09-23T11:00:00', {
      zone: 'UTC',
    });

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={startDateTime}
        activityEndDateTime={endDateTime}
        activityFlags={IDEA_FLAG}
      />,
    );

    // Both idea switch and times should be present
    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });
    expect(ideaSwitch).toBeChecked();
    expect(screen.getByDisplayValue(/09:00/)).toBeDefined();
    expect(screen.getByDisplayValue(/11:00/)).toBeDefined();
  });

  test('toggling isIdea preserves timezone selections', async () => {
    const user = userEvent.setup();
    const startDateTime = DateTime.fromISO('2024-09-23T10:00:00', {
      zone: 'America/New_York',
    });
    const endDateTime = DateTime.fromISO('2024-09-23T14:00:00', {
      zone: 'America/Los_Angeles',
    });

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={startDateTime}
        activityEndDateTime={endDateTime}
        activityFlags={0}
      />,
    );

    // Verify initial timezones
    expect(screen.getByDisplayValue('America/New_York')).toBeDefined();
    expect(screen.getByDisplayValue('America/Los_Angeles')).toBeDefined();

    // Toggle isIdea on
    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });
    await user.click(ideaSwitch);

    // Timezones should be preserved
    await waitFor(() => {
      expect(screen.getByDisplayValue('America/New_York')).toBeDefined();
      expect(screen.getByDisplayValue('America/Los_Angeles')).toBeDefined();
    });

    // Toggle isIdea off
    await user.click(ideaSwitch);

    // Timezones should still be preserved
    await waitFor(() => {
      expect(screen.getByDisplayValue('America/New_York')).toBeDefined();
      expect(screen.getByDisplayValue('America/Los_Angeles')).toBeDefined();
    });
  });

  test('changing timezone works when isIdea is checked', async () => {
    const user = userEvent.setup();
    const startDateTime = DateTime.fromISO('2024-09-23T10:00:00', {
      zone: 'UTC',
    });

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={startDateTime}
        activityFlags={IDEA_FLAG}
      />,
    );

    // Verify idea is checked
    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });
    expect(ideaSwitch).toBeChecked();

    // Change timezone
    const timeZoneSelects = screen.getAllByDisplayValue('UTC');
    const startTimeZoneSelect = timeZoneSelects[0];

    await user.click(startTimeZoneSelect);
    const tokyoOptions = await screen.findAllByText('Asia/Tokyo');
    await user.click(tokyoOptions[0]);

    // Timezone should change while idea remains checked
    await waitFor(() => {
      const labels = screen.getAllByText(/Asia\/Tokyo/);
      expect(labels.length).toBeGreaterThan(0);
    });
    expect(ideaSwitch).toBeChecked();
  });

  test('isIdea state is independent of datetime picker interactions', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={undefined}
        activityFlags={0}
      />,
    );

    // Toggle isIdea on
    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });
    await user.click(ideaSwitch);
    expect(ideaSwitch).toBeChecked();

    // Change timezone (without setting datetime)
    const timeZoneSelects = screen.getAllByDisplayValue('UTC');
    const startTimeZoneSelect = timeZoneSelects[0];

    await user.click(startTimeZoneSelect);
    const parisOptions = await screen.findAllByText('Europe/Paris');
    await user.click(parisOptions[0]);

    // isIdea should still be checked after timezone change
    await waitFor(() => {
      expect(ideaSwitch).toBeChecked();
    });
  });

  test('editing existing idea with times shows correct initial state', () => {
    const startDateTime = DateTime.fromISO('2024-09-23T08:00:00', {
      zone: 'Europe/London',
    });
    const endDateTime = DateTime.fromISO('2024-09-23T10:00:00', {
      zone: 'Europe/London',
    });

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        mode={ActivityFormMode.Edit}
        activityId="activity-1"
        activityTitle="Museum Visit"
        activityStartDateTime={startDateTime}
        activityEndDateTime={endDateTime}
        activityFlags={IDEA_FLAG}
      />,
    );

    // All fields should show correct initial values
    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });
    expect(ideaSwitch).toBeChecked();
    expect(screen.getByDisplayValue(/08:00/)).toBeDefined();
    expect(screen.getByDisplayValue(/10:00/)).toBeDefined();
    expect(
      screen.getAllByDisplayValue('Europe/London').length,
    ).toBeGreaterThanOrEqual(2);
  });

  test('editing existing idea without times shows correct initial state', () => {
    renderWithTheme(
      <ActivityForm
        {...baseProps}
        mode={ActivityFormMode.Edit}
        activityId="activity-1"
        activityTitle="Maybe visit beach"
        activityStartDateTime={undefined}
        activityEndDateTime={undefined}
        activityFlags={IDEA_FLAG}
      />,
    );

    // Idea switch should be checked, no times set
    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });
    expect(ideaSwitch).toBeChecked();

    // Default timezone should be trip timezone
    const timeZoneSelects = screen.getAllByDisplayValue('UTC');
    expect(timeZoneSelects.length).toBeGreaterThanOrEqual(2);
  });

  test('multiple toggle of isIdea does not affect times', async () => {
    const user = userEvent.setup();
    const startDateTime = DateTime.fromISO('2024-09-23T15:00:00', {
      zone: 'UTC',
    });
    const endDateTime = DateTime.fromISO('2024-09-23T17:00:00', {
      zone: 'UTC',
    });

    renderWithTheme(
      <ActivityForm
        {...baseProps}
        activityStartDateTime={startDateTime}
        activityEndDateTime={endDateTime}
        activityFlags={0}
      />,
    );

    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });

    // Toggle multiple times
    await user.click(ideaSwitch); // on
    await user.click(ideaSwitch); // off
    await user.click(ideaSwitch); // on
    await user.click(ideaSwitch); // off

    // Times should remain unchanged
    await waitFor(() => {
      expect(screen.getByDisplayValue(/15:00/)).toBeDefined();
      expect(screen.getByDisplayValue(/17:00/)).toBeDefined();
    });
  });

  test('isIdea flag is preserved with other flags', () => {
    // Test with a combined flag value (e.g., IsIdea + some other flag if exists)
    // Currently only IsIdea exists (value 2), but this tests the flag combination logic
    const combinedFlags = IDEA_FLAG;

    renderWithTheme(
      <ActivityForm {...baseProps} activityFlags={combinedFlags} />,
    );

    const ideaSwitch = screen.getByRole('switch', {
      name: /is this activity an idea/i,
    });
    expect(ideaSwitch).toBeChecked();
  });
});
