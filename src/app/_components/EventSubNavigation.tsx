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
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentPropsWithRef } from "react";

// Proper type for Tab component with Link
type TabWithLinkProps = ComponentPropsWithRef<typeof Tabs.Tab> & {
  href?: string;
};

interface EventSubNavigationProps {
  eventId: string;
}

export default function EventSubNavigation({ eventId }: EventSubNavigationProps) {
  const pathname = usePathname();
  const basePath = `/events/${eventId}`;

  // Determine active tab based on current path
  const getActiveTab = () => {
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

          <TabsTab
            value="latest"
            leftSection={<IconNews size={14} />}
            component={Link}
            href={`${basePath}/latest`}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            Latest
          </TabsTab>

          <TabsTab
            value="asks-offers"
            leftSection={<IconHandStop size={14} />}
            component={Link}
            href={`${basePath}/asks-offers`}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            Asks & Offers
          </TabsTab>

          <TabsTab
            value="participants"
            leftSection={<IconUsers size={14} />}
            component={Link}
            href={`${basePath}/participants`}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            Participants
          </TabsTab>

          <TabsTab
            value="event-projects"
            leftSection={<IconBulb size={14} />}
            component={Link}
            href={`${basePath}/projects`}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            Projects
          </TabsTab>

          <TabsTab
            value="impact"
            leftSection={<IconHeart size={14} />}
            component={Link}
            href={`${basePath}/impact`}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            Impact
          </TabsTab>

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
