"use client";

import { Paper, Tabs } from "@mantine/core";
import {
  IconMapPin,
  IconHeart,
  IconNews,
  IconHandStop,
  IconUsers,
  IconBulb,
  IconSparkles,
} from "@tabler/icons-react";
import Link from "next/link";
import { type ComponentPropsWithRef } from "react";

// Proper type for Tab component with Link
type TabWithLinkProps = ComponentPropsWithRef<typeof Tabs.Tab> & {
  href?: string;
};

interface AdminEventSubNavigationProps {
  eventId: string;
}

export default function AdminEventSubNavigation({ eventId }: AdminEventSubNavigationProps) {
  const basePath = `/events/${eventId}`;

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
      <Tabs value={null} color="blue" variant="default">
        <Tabs.List style={{ borderBottom: 0 }}>
          <TabsTab
            value="my-event"
            leftSection={<IconMapPin size={14} />}
            component={Link}
            href={basePath}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            My Event
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
            value="latest"
            leftSection={<IconNews size={14} />}
            component={Link}
            href={`${basePath}/latest`}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            Latest
          </TabsTab>

          <TabsTab
            value="praise"
            leftSection={<IconSparkles size={14} />}
            component={Link}
            href={`${basePath}/praise`}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            Praise
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
        </Tabs.List>
      </Tabs>
    </Paper>
  );
}
