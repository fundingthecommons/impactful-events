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
  Menu,
  Button,
} from "@mantine/core";
import { IconSearch, IconEye, IconCheck } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";
import TimetableView from "./TimetableView";
import ExpandedView from "./ExpandedView";
import ByFloorView from "./ByFloorView";
import "./schedule.css";

export type ScheduleSession = {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  speakers: string[];
  venueId: string | null;
  sessionTypeId: string | null;
  trackId: string | null;
  venue: { id: string; name: string } | null;
  sessionType: { id: string; name: string; color: string } | null;
  track: { id: string; name: string; color: string } | null;
  sessionSpeakers: Array<{
    role: string;
    user: {
      id: string;
      firstName: string | null;
      surname: string | null;
      name: string | null;
      email: string | null;
      image: string | null;
      profile: {
        bio: string | null;
        jobTitle: string | null;
        company: string | null;
        avatarUrl: string | null;
      } | null;
    };
  }>;
};

interface SchedulePageClientProps {
  eventId: string;
}

export default function SchedulePageClient({ eventId }: SchedulePageClientProps) {
  const [viewMode, setViewMode] = useState<"simple" | "expanded" | "grid" | "by-floor">("simple");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVenueId, setActiveVenueId] = useState<string | null>(null);
  const [activeSessionTypes, setActiveSessionTypes] = useState<string[]>([]);
  const [activeTracks, setActiveTracks] = useState<string[]>([]);
  const [activeFloorManagerId, setActiveFloorManagerId] = useState<string | null>(null);

  const { data: scheduleData, isLoading: scheduleLoading } =
    api.schedule.getEventSchedule.useQuery({ eventId });
  const { data: filterData } =
    api.schedule.getEventScheduleFilters.useQuery({ eventId });

  const sessions = scheduleData?.sessions;

  // Stage 1: Filter sessions (shared between both views)
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    return sessions.filter((session) => {
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
      // Track filter
      if (
        activeTracks.length > 0 &&
        session.trackId &&
        !activeTracks.includes(session.trackId)
      ) {
        return false;
      }
      // Floor manager filter
      if (activeFloorManagerId && filterData?.floorManagers) {
        const manager = filterData.floorManagers.find(
          (fm) => fm.id === activeFloorManagerId,
        );
        if (manager && (!session.venueId || !manager.venueIds.includes(session.venueId))) {
          return false;
        }
      }
      return true;
    });
  }, [sessions, searchQuery, activeVenueId, activeSessionTypes, activeTracks, activeFloorManagerId, filterData?.floorManagers]);

  // Stage 2: Group by day (shared between both views)
  const { days, sessionsByDay } = useMemo(() => {
    const byDay = new Map<string, ScheduleSession[]>();
    for (const session of filteredSessions) {
      const dayKey = new Date(session.startTime).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const existing = byDay.get(dayKey) ?? [];
      existing.push(session);
      byDay.set(dayKey, existing);
    }
    return { days: Array.from(byDay.keys()), sessionsByDay: byDay };
  }, [filteredSessions]);

  // Stage 3: Group by time slot (agenda view only)
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const selectedDay = activeDay ?? days[0] ?? null;

  const timeSlots = useMemo(() => {
    if (!selectedDay) return undefined;
    const daySessions = sessionsByDay.get(selectedDay);
    if (!daySessions) return undefined;

    const byTime = new Map<string, ScheduleSession[]>();
    for (const session of daySessions) {
      const timeKey = new Date(session.startTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const existing = byTime.get(timeKey) ?? [];
      existing.push(session);
      byTime.set(timeKey, existing);
    }
    return byTime;
  }, [selectedDay, sessionsByDay]);

  const toggleSessionType = (typeId: string) => {
    setActiveSessionTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  };

  const toggleTrack = (trackId: string) => {
    setActiveTracks((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId]
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

  const daySessions = selectedDay ? sessionsByDay.get(selectedDay) ?? [] : [];
  const venues = filterData?.venues?.map((v) => ({ id: v.id, name: v.name })) ?? [];

  return (
    <Container size="xl" py="xl">
      {/* Header with title and view toggle */}
      <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap" gap="sm">
        <Stack gap="xs">
          <Title order={1}>{scheduleData.event.name}</Title>
          {scheduleData.event.location && (
            <Text c="dimmed" size="sm">
              {scheduleData.event.location}
            </Text>
          )}
        </Stack>
        <Menu shadow="md" width={180}>
          <Menu.Target>
            <Button variant="default" leftSection={<IconEye size={16} />} size="sm">
              View
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              onClick={() => setViewMode("simple")}
              rightSection={viewMode === "simple" ? <IconCheck size={14} /> : null}
            >
              Simple
            </Menu.Item>
            <Menu.Item
              onClick={() => setViewMode("expanded")}
              rightSection={viewMode === "expanded" ? <IconCheck size={14} /> : null}
            >
              Expanded
            </Menu.Item>
            <Menu.Item
              onClick={() => setViewMode("grid")}
              rightSection={viewMode === "grid" ? <IconCheck size={14} /> : null}
            >
              Grid
            </Menu.Item>
            <Menu.Item
              onClick={() => setViewMode("by-floor")}
              rightSection={viewMode === "by-floor" ? <IconCheck size={14} /> : null}
            >
              By Floor
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Day tabs (shared between both views) */}
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

      {/* View-specific content */}
      {viewMode === "simple" ? (
        <div className="schedule-layout">
          {/* Main schedule area */}
          <div>
            {!selectedDay || !timeSlots ? (
              <Text c="dimmed" ta="center" py="xl">
                No sessions scheduled yet.
              </Text>
            ) : (
              <Stack gap={4}>
                {Array.from(timeSlots.entries()).map(([time, timeSessions]) => (
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
                      {timeSessions.map((session) => (
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
                          {session.track && (
                            <Badge
                              size="xs"
                              variant="light"
                              style={{
                                backgroundColor: `${session.track.color}20`,
                                color: session.track.color,
                              }}
                            >
                              {session.track.name}
                            </Badge>
                          )}
                          {(session.sessionSpeakers.length > 0 || session.speakers.length > 0) && (
                            <Text size="xs" c="dimmed" mt={2}>
                              {[
                                ...session.sessionSpeakers.map((s) =>
                                  s.role !== "Speaker"
                                    ? `${getDisplayName(s.user, "Unknown")} (${s.role})`
                                    : getDisplayName(s.user, "Unknown"),
                                ),
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

              {filterData?.floorManagers && filterData.floorManagers.length > 0 && (
                <div className="schedule-filter-section">
                  <Text fw={600} size="sm" mb="xs">
                    Filter By Floor Manager
                  </Text>
                  <Select
                    placeholder="All floor managers"
                    data={filterData.floorManagers.map((fm) => ({
                      value: fm.id,
                      label: getDisplayName(fm, "Unknown"),
                    }))}
                    value={activeFloorManagerId}
                    onChange={setActiveFloorManagerId}
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

              {filterData?.tracks && filterData.tracks.length > 0 && (
                <div className="schedule-filter-section">
                  <Text fw={600} size="sm" mb="xs">
                    Filter By Track
                  </Text>
                  <Stack gap={6}>
                    {filterData.tracks.map((track) => (
                      <Checkbox
                        key={track.id}
                        checked={activeTracks.includes(track.id)}
                        onChange={() => toggleTrack(track.id)}
                        label={
                          <Group gap={8}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: track.color,
                                flexShrink: 0,
                              }}
                            />
                            <Text size="sm">{track.name}</Text>
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
      ) : viewMode === "expanded" ? (
        <div className="schedule-layout">
          <ExpandedView sessions={daySessions} />
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

              {filterData?.tracks && filterData.tracks.length > 0 && (
                <div className="schedule-filter-section">
                  <Text fw={600} size="sm" mb="xs">
                    Filter By Track
                  </Text>
                  <Stack gap={6}>
                    {filterData.tracks.map((track) => (
                      <Checkbox
                        key={track.id}
                        checked={activeTracks.includes(track.id)}
                        onChange={() => toggleTrack(track.id)}
                        label={
                          <Group gap={8}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: track.color,
                                flexShrink: 0,
                              }}
                            />
                            <Text size="sm">{track.name}</Text>
                          </Group>
                        }
                      />
                    ))}
                  </Stack>
                </div>
              )}
            </Stack>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <TimetableView sessions={daySessions} venues={venues} />
      ) : viewMode === "by-floor" ? (
        <div className="schedule-layout">
          <ByFloorView sessions={daySessions} venues={venues} />
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

              {filterData?.tracks && filterData.tracks.length > 0 && (
                <div className="schedule-filter-section">
                  <Text fw={600} size="sm" mb="xs">
                    Filter By Track
                  </Text>
                  <Stack gap={6}>
                    {filterData.tracks.map((track) => (
                      <Checkbox
                        key={track.id}
                        checked={activeTracks.includes(track.id)}
                        onChange={() => toggleTrack(track.id)}
                        label={
                          <Group gap={8}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: track.color,
                                flexShrink: 0,
                              }}
                            />
                            <Text size="sm">{track.name}</Text>
                          </Group>
                        }
                      />
                    ))}
                  </Stack>
                </div>
              )}
            </Stack>
          </div>
        </div>
      ) : null}
    </Container>
  );
}
