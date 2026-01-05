import { describe, expect, it } from 'vitest';
import { activitiesToIcs } from './icsExport';

describe('activitiesToIcs', () => {
  it('should generate valid ICS content for activities with dates', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Visit Eiffel Tower',
        location: 'Paris, France',
        locationLat: 48.8584,
        locationLng: 2.2945,
        locationDestination: null,
        description: 'Visit the iconic Eiffel Tower',
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T12:00:00Z').getTime(),
        timeZoneStart: 'Europe/Paris',
        timeZoneEnd: 'Europe/Paris',
      },
      {
        id: 'activity-2',
        title: 'Lunch at Le Marais',
        location: 'Le Marais, Paris',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Traditional French cuisine',
        timestampStart: new Date('2024-06-15T13:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T14:30:00Z').getTime(),
        timeZoneStart: null,
        timeZoneEnd: null,
      },
    ];

    const icsContent = activitiesToIcs(
      activities,
      'Europe/Paris',
      'Paris Trip',
    );

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('BEGIN:VEVENT');
    expect(icsContent).toContain('SUMMARY:Visit Eiffel Tower');
    expect(icsContent).toContain('LOCATION:Paris\\, France');
    expect(icsContent).toContain('SUMMARY:Lunch at Le Marais');
    expect(icsContent).toContain('END:VEVENT');
    expect(icsContent).toContain('END:VCALENDAR');
    expect(icsContent).toContain('X-WR-CALNAME:Paris Trip - Activities');
  });

  it('should return empty string when no activities have dates', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Visit Museum',
        location: 'Paris',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Visit the Louvre',
        timestampStart: null,
        timestampEnd: null,
        timeZoneStart: null,
        timeZoneEnd: null,
      },
    ];

    const icsContent = activitiesToIcs(activities, 'Europe/Paris', 'Trip');

    expect(icsContent).toBe('');
  });

  it('should handle activities with origin and destination', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Train to Lyon',
        location: 'Paris Gare de Lyon',
        locationLat: 48.8447,
        locationLng: 2.3739,
        locationDestination: 'Lyon Part-Dieu',
        description: 'High-speed train',
        timestampStart: new Date('2024-06-16T09:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-16T11:00:00Z').getTime(),
        timeZoneStart: 'Europe/Paris',
        timeZoneEnd: 'Europe/Paris',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'Europe/Paris', 'Trip');

    expect(icsContent).toContain(
      'LOCATION:Paris Gare de Lyon to Lyon Part-Dieu',
    );
  });

  it('should escape special characters in text fields', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Meeting; Important, Notes',
        location: 'Room A\\B',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Discussion\nAbout project',
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T11:00:00Z').getTime(),
        timeZoneStart: 'Europe/Paris',
        timeZoneEnd: 'Europe/Paris',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'Europe/Paris');

    expect(icsContent).toContain('SUMMARY:Meeting\\; Important\\, Notes');
    expect(icsContent).toContain('LOCATION:Room A\\\\B');
    expect(icsContent).toContain('DESCRIPTION:Discussion\\nAbout project');
  });

  it('should handle all-day events correctly', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'All Day Conference',
        location: 'Convention Center',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Full day event',
        timestampStart: new Date('2024-06-15T00:00:00-04:00').getTime(),
        timestampEnd: new Date('2024-06-15T23:59:00-04:00').getTime(),
        timeZoneStart: 'America/New_York',
        timeZoneEnd: 'America/New_York',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'America/New_York', 'Trip');

    expect(icsContent).toContain('DTSTART;VALUE=DATE:');
    expect(icsContent).toContain('DTEND;VALUE=DATE:');
    expect(icsContent).not.toContain('TZID');
  });

  it('should handle activities spanning multiple days', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Multi-day Workshop',
        location: 'Conference Hall',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Three-day workshop',
        timestampStart: new Date('2024-06-15T09:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-17T17:00:00Z').getTime(),
        timeZoneStart: 'Europe/Paris',
        timeZoneEnd: 'Europe/Paris',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'Europe/Paris', 'Trip');

    expect(icsContent).toContain('BEGIN:VEVENT');
    expect(icsContent).toContain('SUMMARY:Multi-day Workshop');
    expect(icsContent).toContain('DTSTART');
    expect(icsContent).toContain('DTEND');
  });

  it('should handle activities with different start and end timezones', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Flight from NYC to London',
        location: 'JFK Airport',
        locationLat: 40.6413,
        locationLng: -73.7781,
        locationDestination: 'Heathrow Airport',
        description: 'Transatlantic flight',
        timestampStart: new Date('2024-06-15T20:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-16T08:00:00Z').getTime(),
        timeZoneStart: 'America/New_York',
        timeZoneEnd: 'Europe/London',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'America/New_York', 'Trip');

    expect(icsContent).toContain('DTSTART;TZID=America/New_York:');
    expect(icsContent).toContain('DTEND;TZID=Europe/London:');
    expect(icsContent).toContain('LOCATION:JFK Airport to Heathrow Airport');
  });

  it('should include geo coordinates when available', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Visit Statue of Liberty',
        location: 'Liberty Island',
        locationLat: 40.6892,
        locationLng: -74.0445,
        locationDestination: null,
        description: 'Iconic landmark',
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T12:00:00Z').getTime(),
        timeZoneStart: 'America/New_York',
        timeZoneEnd: 'America/New_York',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'America/New_York', 'Trip');

    expect(icsContent).toContain('GEO:40.6892;-74.0445');
    expect(icsContent).toContain('Iconic landmark');
    // Line may be folded, so check for parts of the URL
    expect(icsContent).toContain('https://www.google.com/maps?q=40.6');
    expect(icsContent).toMatch(/892,-74\.0445/);
  });

  it('should handle activities without location', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Virtual Meeting',
        location: '',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Online conference call',
        timestampStart: new Date('2024-06-15T14:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T15:00:00Z').getTime(),
        timeZoneStart: 'UTC',
        timeZoneEnd: 'UTC',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'UTC', 'Trip');

    expect(icsContent).toContain('SUMMARY:Virtual Meeting');
    expect(icsContent).not.toContain('LOCATION:');
    expect(icsContent).not.toContain('GEO:');
  });

  it('should handle activities without description', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Quick Errand',
        location: 'Downtown',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: '',
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T11:00:00Z').getTime(),
        timeZoneStart: 'America/Los_Angeles',
        timeZoneEnd: 'America/Los_Angeles',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'America/Los_Angeles');

    expect(icsContent).toContain('SUMMARY:Quick Errand');
    expect(icsContent).not.toContain('DESCRIPTION:');
  });

  it('should generate unique UIDs for each activity', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Activity 1',
        location: 'Location 1',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Description 1',
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T11:00:00Z').getTime(),
        timeZoneStart: 'UTC',
        timeZoneEnd: 'UTC',
      },
      {
        id: 'activity-2',
        title: 'Activity 2',
        location: 'Location 2',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Description 2',
        timestampStart: new Date('2024-06-15T12:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T13:00:00Z').getTime(),
        timeZoneStart: 'UTC',
        timeZoneEnd: 'UTC',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'UTC', 'Trip');

    expect(icsContent).toContain('UID:activity-1@ikuyo');
    expect(icsContent).toContain('UID:activity-2@ikuyo');
  });

  it('should include DTSTAMP in all events', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Test Activity',
        location: 'Test Location',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Test description',
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T11:00:00Z').getTime(),
        timeZoneStart: 'UTC',
        timeZoneEnd: 'UTC',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'UTC');

    expect(icsContent).toContain('DTSTAMP:');
    // DTSTAMP should be in UTC format (ending with Z)
    expect(icsContent).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });

  it('should filter out activities with only start time', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Incomplete Activity',
        location: 'Somewhere',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Missing end time',
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: null,
        timeZoneStart: 'UTC',
        timeZoneEnd: 'UTC',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'UTC');

    expect(icsContent).toBe('');
  });

  it('should filter out activities with only end time', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Incomplete Activity',
        location: 'Somewhere',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Missing start time',
        timestampStart: null,
        timestampEnd: new Date('2024-06-15T11:00:00Z').getTime(),
        timeZoneStart: 'UTC',
        timeZoneEnd: 'UTC',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'UTC');

    expect(icsContent).toBe('');
  });

  it('should handle mixed activities (some with dates, some without)', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Activity with date',
        location: 'Location 1',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Has date',
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T11:00:00Z').getTime(),
        timeZoneStart: 'UTC',
        timeZoneEnd: 'UTC',
      },
      {
        id: 'activity-2',
        title: 'Activity without date',
        location: 'Location 2',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'No date',
        timestampStart: null,
        timestampEnd: null,
        timeZoneStart: null,
        timeZoneEnd: null,
      },
    ];

    const icsContent = activitiesToIcs(activities, 'UTC');

    expect(icsContent).toContain('SUMMARY:Activity with date');
    expect(icsContent).not.toContain('SUMMARY:Activity without date');
    expect(icsContent).toContain('BEGIN:VEVENT');
    expect(icsContent).toContain('END:VEVENT');
  });

  it('should use trip timezone when activity timezone is not specified', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Activity',
        location: 'Location',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Description',
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T11:00:00Z').getTime(),
        timeZoneStart: null,
        timeZoneEnd: null,
      },
    ];

    const icsContent = activitiesToIcs(activities, 'America/Chicago', 'Trip');

    expect(icsContent).toContain('DTSTART;TZID=America/Chicago:');
    expect(icsContent).toContain('DTEND;TZID=America/Chicago:');
  });

  it('should generate calendar name without trip title', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Activity',
        location: 'Location',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Description',
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T11:00:00Z').getTime(),
        timeZoneStart: 'UTC',
        timeZoneEnd: 'UTC',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'UTC');

    expect(icsContent).toContain('X-WR-CALNAME:Activities');
    expect(icsContent).not.toContain('null');
    expect(icsContent).not.toContain('undefined');
  });

  it('should handle very long text that needs line folding', () => {
    const longDescription =
      'This is a very long description that exceeds the 75 character limit for ICS files and should be properly folded according to the RFC 5545 specification.';
    const activities = [
      {
        id: 'activity-1',
        title: 'Activity with long description',
        location: 'Location',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: longDescription,
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T11:00:00Z').getTime(),
        timeZoneStart: 'UTC',
        timeZoneEnd: 'UTC',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'UTC');

    expect(icsContent).toContain('DESCRIPTION:');
    // Should contain the full description content
    expect(icsContent).toContain('very long description');
  });

  it('should handle destination same as origin', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Round trip activity',
        location: 'Central Park',
        locationLat: 40.785091,
        locationLng: -73.968285,
        locationDestination: 'Central Park',
        description: 'Start and end at same place',
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T12:00:00Z').getTime(),
        timeZoneStart: 'America/New_York',
        timeZoneEnd: 'America/New_York',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'America/New_York', 'Trip');

    // Should not duplicate the location name
    expect(icsContent).toContain('LOCATION:Central Park');
    expect(icsContent).not.toContain('Central Park to Central Park');
  });

  it('should include correct calendar metadata', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Activity',
        location: 'Location',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Description',
        timestampStart: new Date('2024-06-15T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T11:00:00Z').getTime(),
        timeZoneStart: 'UTC',
        timeZoneEnd: 'UTC',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'UTC', 'My Trip');

    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('PRODID:-//Ikuyo//Activities Export//EN');
    expect(icsContent).toContain('CALSCALE:GREGORIAN');
    expect(icsContent).toContain('METHOD:PUBLISH');
    expect(icsContent).toContain('X-WR-TIMEZONE:UTC');
  });

  it('should handle empty activities array', () => {
    const icsContent = activitiesToIcs([], 'UTC', 'Trip');

    expect(icsContent).toBe('');
  });

  it('should handle activities at midnight boundary', () => {
    const activities = [
      {
        id: 'activity-1',
        title: 'Midnight Activity',
        location: 'Location',
        locationLat: null,
        locationLng: null,
        locationDestination: null,
        description: 'Starts at midnight',
        timestampStart: new Date('2024-06-15T00:00:00Z').getTime(),
        timestampEnd: new Date('2024-06-15T00:00:00Z').getTime(),
        timeZoneStart: 'UTC',
        timeZoneEnd: 'UTC',
      },
    ];

    const icsContent = activitiesToIcs(activities, 'UTC');

    expect(icsContent).toContain('BEGIN:VEVENT');
    expect(icsContent).toContain('DTSTART;VALUE=DATE:');
  });
});
