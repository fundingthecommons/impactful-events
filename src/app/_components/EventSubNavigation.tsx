"use client";

import { Paper, Tabs, Text } from "@mantine/core";
import {
  IconMapPin,
  IconHeart,
  IconNews,
  IconHandStop,
  IconUsers,
  IconBulb,
  IconCalendarEvent,
  IconSettings,
  IconMicrophone,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentPropsWithRef } from "react";
import { api } from "~/trpc/react";

// Proper type for Tab component with Link
type TabWithLinkProps = ComponentPropsWithRef<typeof Tabs.Tab> & {
  href?: string;
};

interface EventSubNavigationProps {
  eventId: string;
  eventName?: string;
  featureFlags?: {
    featureAsksOffers: boolean;
    featureProjects: boolean;
    featureNewsfeed: boolean;
    featureImpactAnalytics: boolean;
    featureScheduleManagement?: boolean;
    featureSpeakerVetting?: boolean;
  };
  isFloorOwner?: boolean;
  isAdmin?: boolean;
}

export default function EventSubNavigation({
  eventId,
  eventName,
  featureFlags,
  isFloorOwner,
  isAdmin,
}: EventSubNavigationProps) {
  const pathname = usePathname();
  const basePath = `/events/${eventId}`;
  const { data: session } = useSession();

  // Client-side fallback: only fires when server-side check missed floor ownership
  const shouldCheckClientSide =
    !isFloorOwner &&
    !isAdmin &&
    !!session?.user &&
    featureFlags?.featureScheduleManagement !== false;

  const { data: clientIsFloorOwner } = api.schedule.isFloorOwner.useQuery(
    { eventId },
    { enabled: shouldCheckClientSide },
  );

  // Determine active tab based on current path
  // Use path segments after /events/[eventId]/ to handle both ID and slug URLs
  const getActiveTab = () => {
    const match = /^\/events\/[^/]+(\/.*)?$/.exec(pathname);
    const subPath = match?.[1] ?? "";
    if (subPath.startsWith("/speakers")) return "speakers";
    if (subPath.startsWith("/manage-schedule")) return "manage-schedule";
    if (subPath.startsWith("/schedule")) return "schedule";
    if (subPath.startsWith("/impact")) return "impact";
    if (subPath.startsWith("/latest")) return "latest";
    if (subPath.startsWith("/asks-offers")) return "asks-offers";
    if (subPath.startsWith("/participants")) return "participants";
    if (subPath.startsWith("/projects")) return "event-projects";
    if (subPath === "" || subPath === "/") return "my-event";
    return null;
  };

  const TabsTab = Tabs.Tab as React.ComponentType<TabWithLinkProps>;

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const isEffectiveFloorOwner = isFloorOwner || clientIsFloorOwner === true;
  const showManageSchedule =
    isEffectiveFloorOwner ||
    (isAdmin && featureFlags?.featureScheduleManagement !== false);

  return (
    <Paper
      radius={0}
      px="lg"
      style={{
        borderTop: 0,
        borderLeft: "1px solid var(--mantine-color-default-border)",
        borderRight: "1px solid var(--mantine-color-default-border)",
        borderBottom: "1px solid var(--mantine-color-default-border)",
        background: "var(--theme-surface-secondary, var(--mantine-color-gray-0))",
      }}
    >
      <Tabs value={getActiveTab()} color="blue" variant="default">
        <Tabs.List style={{ borderBottom: 0 }}>
          {eventName && (
            <Text
              fw={700}
              size="sm"
              c="dimmed"
              style={{
                display: "flex",
                alignItems: "center",
                paddingRight: "0.75rem",
                whiteSpace: "nowrap",
              }}
            >
              {eventName}:
            </Text>
          )}
          <TabsTab
            value="schedule"
            leftSection={<IconCalendarEvent size={14} />}
            component={Link}
            href={`${basePath}/schedule`}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            Schedule
          </TabsTab>

          {featureFlags?.featureNewsfeed !== false && (
            <TabsTab
              value="latest"
              leftSection={<IconNews size={14} />}
              component={Link}
              href={`${basePath}/latest`}
              style={{ textDecoration: "none", fontSize: "0.875rem" }}
            >
              Latest
            </TabsTab>
          )}

          {featureFlags?.featureAsksOffers !== false && (
            <TabsTab
              value="asks-offers"
              leftSection={<IconHandStop size={14} />}
              component={Link}
              href={`${basePath}/asks-offers`}
              style={{ textDecoration: "none", fontSize: "0.875rem" }}
            >
              Asks & Offers
            </TabsTab>
          )}

          {isAdmin && (
            <TabsTab
              value="participants"
              leftSection={<IconUsers size={14} />}
              component={Link}
              href={`${basePath}/participants`}
              style={{ textDecoration: "none", fontSize: "0.875rem" }}
            >
              Participants
            </TabsTab>
          )}

          {featureFlags?.featureProjects !== false && (
            <TabsTab
              value="event-projects"
              leftSection={<IconBulb size={14} />}
              component={Link}
              href={`${basePath}/projects`}
              style={{ textDecoration: "none", fontSize: "0.875rem" }}
            >
              Projects
            </TabsTab>
          )}

          {isAdmin && featureFlags?.featureImpactAnalytics !== false && (
            <TabsTab
              value="impact"
              leftSection={<IconHeart size={14} />}
              component={Link}
              href={`${basePath}/impact`}
              style={{ textDecoration: "none", fontSize: "0.875rem" }}
            >
              Impact
            </TabsTab>
          )}

          {showManageSchedule && (
            <TabsTab
              value="manage-schedule"
              leftSection={<IconSettings size={14} />}
              component={Link}
              href={`${basePath}/manage-schedule`}
              style={{ textDecoration: "none", fontSize: "0.875rem" }}
            >
              Manage Floors
            </TabsTab>
          )}

          {showManageSchedule && featureFlags?.featureSpeakerVetting !== false && (
            <TabsTab
              value="speakers"
              leftSection={<IconMicrophone size={14} />}
              component={Link}
              href={`${basePath}/speakers`}
              style={{ textDecoration: "none", fontSize: "0.875rem" }}
            >
              Speakers
            </TabsTab>
          )}

          <TabsTab
            value="my-event"
            leftSection={<IconMapPin size={14} />}
            component={Link}
            href={basePath}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            My Event
          </TabsTab>
        </Tabs.List>
      </Tabs>
    </Paper>
  );
}
