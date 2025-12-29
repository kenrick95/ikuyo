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
});
