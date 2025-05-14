import React from 'react';
import { TimetableCell } from './TimetableCell';
import { pad2 } from './time';

interface TimetableGridProps {
  days: number;
}

export function TimetableGrid({ days }: TimetableGridProps) {
  // Create an array of hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Create an array of days (1 to days)
  const daysArray = Array.from({ length: days }, (_, i) => i + 1);

  // Use fewer intervals for better performance - every 30 mins
  const timeIntervals = [0, 30];

  return (
    <>
      {daysArray.map((day) => (
        <React.Fragment key={`day-${day}`}>
          {hours.map((hour) => (
            <React.Fragment key={`day-${day}-hour-${hour}`}>
              {timeIntervals.map((minute) => {
                const timeStr = `${pad2(hour)}${pad2(minute)}`;
                const columnStr = `d${day}-c1`; // Assuming single column per day

                return (
                  <div
                    key={`${day}-${timeStr}`}
                    style={{
                      gridRowStart: `t${timeStr}`,
                      gridRowEnd:
                        minute === 30
                          ? `te${pad2(hour)}59`
                          : `te${pad2(hour)}30`,
                      gridColumnStart: `d${day}`,
                      gridColumnEnd: `de${day}`,
                    }}
                  >
                    <TimetableCell row={`t${timeStr}`} column={columnStr} />
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </>
  );
}
