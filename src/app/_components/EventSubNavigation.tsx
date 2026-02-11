"use client";

import { Paper, Tabs } from "@mantine/core";
import {
  IconMapPin,
  IconHeart,
  IconNews,
  IconHandStop,
  IconUsers,
  IconBulb,
  IconCalendarEvent,
  IconSettings,
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
  featureFlags?: {
    featureAsksOffers: boolean;
    featureProjects: boolean;
    featureNewsfeed: boolean;
    featureImpactAnalytics: boolean;
    featureScheduleManagement?: boolean;
  };
  isFloorOwner?: boolean;
  isAdmin?: boolean;
}

export default function EventSubNavigation({
  eventId,
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
  const getActiveTab = () => {
    if (pathname.startsWith(`${basePath}/manage-schedule`)) return "manage-schedule";
    if (pathname.startsWith(`${basePath}/schedule`)) return "schedule";
    if (pathname.startsWith(`${basePath}/impact`)) return "impact";
    if (pathname.startsWith(`${basePath}/latest`)) return "latest";
    if (pathname.startsWith(`${basePath}/asks-offers`)) return "asks-offers";
    if (pathname.startsWith(`${basePath}/participants`)) return "participants";
    if (pathname.startsWith(`${basePath}/projects`)) return "event-projects";
    if (pathname === basePath) return "my-event";
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

          <TabsTab
            value="participants"
            leftSection={<IconUsers size={14} />}
            component={Link}
            href={`${basePath}/participants`}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            Participants
          </TabsTab>

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

          {featureFlags?.featureImpactAnalytics !== false && (
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
