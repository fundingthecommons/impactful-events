"use client";

import { useState, useMemo } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  TextInput,
  Select,
  Checkbox,
  Loader,
  Center,
  Tabs,
  Badge,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";
import "./schedule.css";

type ScheduleSession = {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  speakers: string[];
  venueId: string | null;
  sessionTypeId: string | null;
  venue: { id: string; name: string } | null;
  sessionType: { id: string; name: string; color: string } | null;
  sessionSpeakers: Array<{
    user: {
      id: string;
      firstName: string | null;
      surname: string | null;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  }>;
};

interface SchedulePageClientProps {
  eventId: string;
}

export default function SchedulePageClient({ eventId }: SchedulePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVenueId, setActiveVenueId] = useState<string | null>(null);
  const [activeSessionTypes, setActiveSessionTypes] = useState<string[]>([]);

  const { data: scheduleData, isLoading: scheduleLoading } =
    api.schedule.getEventSchedule.useQuery({ eventId });
  const { data: filterData } =
    api.schedule.getEventScheduleFilters.useQuery({ eventId });

  const sessions = scheduleData?.sessions;

  // Group sessions by day, then by time slot, with client-side filtering
  const { days, groupedByDay } = useMemo(() => {
    if (!sessions) return { days: [] as string[], groupedByDay: new Map<string, Map<string, ScheduleSession[]>>() };

    // Filter sessions
    const filtered = sessions.filter((session) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = session.title.toLowerCase().includes(q);
        const matchesSpeaker =
          session.speakers.some((s) => s.toLowerCase().includes(q)) ||
          session.sessionSpeakers.some((s) =>
            getDisplayName(s.user, "").toLowerCase().includes(q),
          );
        const matchesVenue = session.venue?.name.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesSpeaker && !matchesVenue) return false;
      }
      // Venue filter
      if (activeVenueId && session.venueId !== activeVenueId) return false;
      // Session type filter
      if (
        activeSessionTypes.length > 0 &&
        session.sessionTypeId &&
        !activeSessionTypes.includes(session.sessionTypeId)
      ) {
        return false;
      }
      return true;
    });

    // Group by day
    const byDay = new Map<string, ScheduleSession[]>();
    for (const session of filtered) {
      const dayKey = new Date(session.startTime).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const existing = byDay.get(dayKey) ?? [];
      existing.push(session);
      byDay.set(dayKey, existing);
    }

    // For each day, group by time slot
    const groupedByDayResult = new Map<string, Map<string, ScheduleSession[]>>();
    for (const [day, sessions] of byDay) {
      const byTime = new Map<string, ScheduleSession[]>();
      for (const session of sessions) {
        const timeKey = new Date(session.startTime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        const existing = byTime.get(timeKey) ?? [];
        existing.push(session);
        byTime.set(timeKey, existing);
      }
      groupedByDayResult.set(day, byTime);
    }

    return {
      days: Array.from(byDay.keys()),
      groupedByDay: groupedByDayResult,
    };
  }, [sessions, searchQuery, activeVenueId, activeSessionTypes]);

  const [activeDay, setActiveDay] = useState<string | null>(null);
  const selectedDay = activeDay ?? days[0] ?? null;

  const toggleSessionType = (typeId: string) => {
    setActiveSessionTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  };

  if (scheduleLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!scheduleData?.event) {
    return (
      <Container size="xl" py="xl">
        <Text c="dimmed">Event not found.</Text>
      </Container>
    );
  }

  const timeSlots = selectedDay ? groupedByDay.get(selectedDay) : undefined;

  return (
    <Container size="xl" py="xl">
      <Stack gap="xs" mb="lg">
        <Title order={1}>{scheduleData.event.name}</Title>
        {scheduleData.event.location && (
          <Text c="dimmed" size="sm">
            {scheduleData.event.location}
          </Text>
        )}
      </Stack>

      <div className="schedule-layout">
        {/* Main schedule area */}
        <div>
          {/* Day tabs */}
          {days.length > 1 && (
            <Tabs
              value={selectedDay}
              onChange={setActiveDay}
              mb="md"
              variant="outline"
            >
              <Tabs.List>
                {days.map((day) => (
                  <Tabs.Tab key={day} value={day}>
                    {day}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
          )}

          {days.length === 1 && selectedDay && (
            <Title order={3} mb="md" c="dimmed" fw={500}>
              {selectedDay}
            </Title>
          )}

          {/* Time slots */}
          {!selectedDay || !timeSlots ? (
            <Text c="dimmed" ta="center" py="xl">
              No sessions scheduled yet.
            </Text>
          ) : (
            <Stack gap={4}>
              {Array.from(timeSlots.entries()).map(([time, sessions]) => (
                <div key={time} className="schedule-time-group">
                  <div className="schedule-time-label">
                    <Text
                      fw={600}
                      size="sm"
                      style={{ color: "var(--schedule-time-label-color)" }}
                    >
                      {time}
                    </Text>
                  </div>
                  <Stack gap={4}>
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="schedule-session-card"
                        style={{
                          borderLeft: `4px solid ${session.sessionType?.color ?? "#94a3b8"}`,
                          backgroundColor: session.sessionType?.color
                            ? `${session.sessionType.color}12`
                            : undefined,
                        }}
                      >
                        <Text fw={600} size="sm">
                          {session.title}
                        </Text>
                        {session.venue && (
                          <Text size="xs" c="dimmed">
                            {session.sessionType?.name
                              ? `${session.sessionType.name} - `
                              : ""}
                            {session.venue.name}
                          </Text>
                        )}
                        {!session.venue && session.sessionType && (
                          <Text size="xs" c="dimmed">
                            {session.sessionType.name}
                          </Text>
                        )}
                        {(session.sessionSpeakers.length > 0 || session.speakers.length > 0) && (
                          <Text size="xs" c="dimmed" mt={2}>
                            {[
                              ...session.sessionSpeakers.map((s) => getDisplayName(s.user, "Unknown")),
                              ...session.speakers,
                            ].join(" \u2022 ")}
                          </Text>
                        )}
                      </div>
                    ))}
                  </Stack>
                </div>
              ))}
            </Stack>
          )}
        </div>

        {/* Filter sidebar */}
        <div className="schedule-sidebar">
          <Stack gap="md">
            <div className="schedule-filter-section">
              <TextInput
                placeholder="Schedule or people"
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                styles={{
                  input: {
                    backgroundColor: "var(--schedule-search-bg)",
                  },
                }}
              />
            </div>

            {filterData?.venues && filterData.venues.length > 0 && (
              <div className="schedule-filter-section">
                <Text fw={600} size="sm" mb="xs">
                  Filter By Venue
                </Text>
                <Select
                  placeholder="All venues"
                  data={filterData.venues.map((v) => ({
                    value: v.id,
                    label: v.name,
                  }))}
                  value={activeVenueId}
                  onChange={setActiveVenueId}
                  clearable
                  styles={{
                    input: {
                      backgroundColor: "var(--schedule-search-bg)",
                    },
                  }}
                />
              </div>
            )}

            {filterData?.sessionTypes && filterData.sessionTypes.length > 0 && (
              <div className="schedule-filter-section">
                <Text fw={600} size="sm" mb="xs">
                  Filter By Type
                </Text>
                <Stack gap={6}>
                  {filterData.sessionTypes.map((type) => (
                    <Checkbox
                      key={type.id}
                      checked={activeSessionTypes.includes(type.id)}
                      onChange={() => toggleSessionType(type.id)}
                      label={
                        <Group gap={8}>
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              backgroundColor: type.color,
                              flexShrink: 0,
                            }}
                          />
                          <Text size="sm">{type.name}</Text>
                        </Group>
                      }
                    />
                  ))}
                </Stack>
              </div>
            )}

            {sessions && sessions.length > 0 && (
              <div className="schedule-filter-section">
                <Group gap="xs">
                  <Badge variant="light" size="sm">
                    {sessions.length} sessions
                  </Badge>
                </Group>
              </div>
            )}
          </Stack>
        </div>
      </div>
    </Container>
  );
}
