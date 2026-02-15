"use client";

import { useMemo } from "react";
import { Text, Stack } from "@mantine/core";
import { type ScheduleSession } from "./SchedulePageClient";

interface ByFloorViewProps {
  sessions: ScheduleSession[];
  venues: Array<{ id: string; name: string }>;
}

function formatTimeShort(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

export default function ByFloorView({ sessions, venues }: ByFloorViewProps) {
  const sessionsByVenue = useMemo(() => {
    const byVenue = new Map<string, ScheduleSession[]>();

    // Initialize all venues (even empty ones)
    for (const venue of venues) {
      byVenue.set(venue.id, []);
    }

    // Group sessions by venue
    for (const session of sessions) {
      if (session.venueId) {
        const existing = byVenue.get(session.venueId) ?? [];
        existing.push(session);
        byVenue.set(session.venueId, existing);
      }
    }

    // Sort sessions within each venue by time
    for (const [, venueSessions] of byVenue) {
      venueSessions.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    }

    return byVenue;
  }, [sessions, venues]);

  if (sessions.length === 0 || venues.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No sessions to display.
      </Text>
    );
  }

  return (
    <Stack gap="xl">
      {venues.map((venue) => {
        const venueSessions = sessionsByVenue.get(venue.id) ?? [];
        if (venueSessions.length === 0) return null;

        return (
          <div key={venue.id} className="by-floor-venue-group">
            <Text
              className="by-floor-venue-label"
              fw={600}
              size="sm"
              c="blue"
            >
              {venue.name}
            </Text>
            <Stack gap={4}>
              {venueSessions.map((session) => {
                const color =
                  session.sessionType?.color ?? "#94a3b8";

                return (
                  <div
                    key={session.id}
                    className="by-floor-session-bar"
                    style={{ backgroundColor: `${color}50` }}
                  >
                    <Text fw={500} size="sm">
                      <Text
                        span
                        fw={700}
                        size="sm"
                      >
                        {formatTimeShort(session.startTime)}
                      </Text>
                      {" \u2022 "}
                      {session.title}
                    </Text>
                  </div>
                );
              })}
            </Stack>
          </div>
        );
      })}
    </Stack>
  );
}
