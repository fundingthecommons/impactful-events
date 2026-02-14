"use client";

import { useMemo } from "react";
import { Text } from "@mantine/core";
import { type ScheduleSession } from "./SchedulePageClient";

interface TimetableViewProps {
  sessions: ScheduleSession[];
  venues: Array<{ id: string; name: string }>;
}

const FIFTEEN_MIN_MS = 15 * 60 * 1000;
const ROW_HEIGHT_PX = 20;

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function TimetableView({ sessions, venues }: TimetableViewProps) {
  const { timeSlots, sessionsGrid, slotCount } = useMemo(() => {
    if (sessions.length === 0) {
      return { timeSlots: [], sessionsGrid: [], slotCount: 0 };
    }

    // Find earliest start and latest end
    let earliest = Infinity;
    let latest = -Infinity;
    for (const s of sessions) {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      if (start < earliest) earliest = start;
      if (end > latest) latest = end;
    }

    // Round earliest down and latest up to 15-min boundaries
    const roundedEarliest = Math.floor(earliest / FIFTEEN_MIN_MS) * FIFTEEN_MIN_MS;
    const roundedLatest = Math.ceil(latest / FIFTEEN_MIN_MS) * FIFTEEN_MIN_MS;

    // Generate time slot labels
    const slots: Array<{ time: Date; row: number }> = [];
    let current = roundedEarliest;
    let row = 1;
    while (current < roundedLatest) {
      slots.push({ time: new Date(current), row });
      current += FIFTEEN_MIN_MS;
      row++;
    }

    // Compute grid positions for each session
    const grid = sessions
      .filter((s) => s.venueId !== null)
      .map((session) => {
        const startMs = new Date(session.startTime).getTime();
        const endMs = new Date(session.endTime).getTime();
        // +2 because row 1 is the header
        const startRow = Math.floor((startMs - roundedEarliest) / FIFTEEN_MIN_MS) + 2;
        const endRow = Math.max(
          startRow + 1,
          Math.ceil((endMs - roundedEarliest) / FIFTEEN_MIN_MS) + 2,
        );
        return { session, startRow, endRow };
      });

    return {
      timeSlots: slots,
      sessionsGrid: grid,
      slotCount: row - 1,
    };
  }, [sessions]);

  if (sessions.length === 0 || venues.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No sessions to display in timetable view.
      </Text>
    );
  }

  return (
    <div className="timetable-wrapper">
      <div
        className="timetable-grid"
        style={{
          gridTemplateColumns: `60px repeat(${venues.length}, minmax(140px, 1fr))`,
          gridTemplateRows: `auto repeat(${slotCount}, ${ROW_HEIGHT_PX}px)`,
        }}
      >
        {/* Corner cell */}
        <div className="timetable-corner" style={{ gridRow: 1, gridColumn: 1 }} />

        {/* Venue headers */}
        {venues.map((venue, i) => (
          <div
            key={venue.id}
            className="timetable-venue-header"
            style={{ gridRow: 1, gridColumn: i + 2 }}
          >
            <Text fw={600} size="sm" ta="center">
              {venue.name}
            </Text>
          </div>
        ))}

        {/* Time labels — show every 15 minutes, with hour labels bolder */}
        {timeSlots.map((slot) => {
          const minutes = slot.time.getMinutes();
          const isHour = minutes === 0;
          return (
            <div
              key={slot.row}
              className="timetable-time-label"
              style={{ gridRow: slot.row + 1, gridColumn: 1 }}
            >
              <Text size="xs" fw={isHour ? 600 : 400} c="dimmed">
                {formatTime(slot.time)}
              </Text>
            </div>
          );
        })}

        {/* Horizontal gridlines — every 30 minutes (on the hour and half hour) */}
        {timeSlots
          .filter((slot) => slot.time.getMinutes() % 30 === 0)
          .map((slot) => (
            <div
              key={`line-${slot.row}`}
              className="timetable-gridline"
              style={{
                gridRow: slot.row + 1,
                gridColumn: `1 / ${venues.length + 2}`,
              }}
            />
          ))}

        {/* Session blocks */}
        {sessionsGrid.map(({ session, startRow, endRow }) => {
          const venueIndex = venues.findIndex((v) => v.id === session.venueId);
          if (venueIndex === -1) return null;
          const color = session.sessionType?.color ?? session.track?.color ?? "#94a3b8";

          return (
            <div
              key={session.id}
              className="timetable-session-block"
              style={{
                gridRow: `${startRow} / ${endRow}`,
                gridColumn: venueIndex + 2,
                backgroundColor: `${color}30`,
                borderLeft: `3px solid ${color}`,
              }}
            >
              <Text fw={600} size="xs" lineClamp={3} style={{ lineHeight: 1.3 }}>
                {session.title}
              </Text>
              <Text size="xs" c="dimmed" style={{ fontSize: 10, lineHeight: 1.2 }}>
                {formatTime(session.startTime)} - {formatTime(session.endTime)}
              </Text>
            </div>
          );
        })}
      </div>
    </div>
  );
}
