"use client";

import { Tabs } from "@mantine/core";
import {
  IconHome,
  IconUsers,
  IconBulb,
  IconHeartHandshake,
  IconCalendarEvent,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentPropsWithRef } from "react";

// Proper type for Tab component with Link
type TabWithLinkProps = ComponentPropsWithRef<typeof Tabs.Tab> & {
  href?: string;
};

interface AcceptedEvent {
  id: string;
  name: string;
}

interface MainNavigationProps {
  acceptedEvents?: AcceptedEvent[];
}

export default function MainNavigation({ acceptedEvents = [] }: MainNavigationProps) {
  const pathname = usePathname();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/community")) return "community";
    if (pathname.startsWith("/profiles")) return "profiles";
    if (pathname.startsWith("/projects")) return "projects";

    // Check if on an event page
    for (const event of acceptedEvents) {
      if (pathname.startsWith(`/events/${event.id}`)) {
        return `event-${event.id}`;
      }
    }

    return null;
  };

  const TabsTab = Tabs.Tab as React.ComponentType<TabWithLinkProps>;

  return (
    <Tabs value={getActiveTab()} color="blue">
      <Tabs.List>
        <TabsTab
          value="home"
          leftSection={<IconHome size={16} />}
          component={Link}
          href="/"
          style={{ textDecoration: "none" }}
        >
          Home
        </TabsTab>

        <TabsTab
          value="community"
          leftSection={<IconHeartHandshake size={16} />}
          component={Link}
          href="/community"
          style={{ textDecoration: "none" }}
        >
          Community
        </TabsTab>

        <TabsTab
          value="profiles"
          leftSection={<IconUsers size={16} />}
          component={Link}
          href="/profiles"
          style={{ textDecoration: "none" }}
        >
          Profiles
        </TabsTab>

        <TabsTab
          value="projects"
          leftSection={<IconBulb size={16} />}
          component={Link}
          href="/projects"
          style={{ textDecoration: "none" }}
        >
          Projects
        </TabsTab>

        {/* Dynamic event tabs for accepted residents */}
        {acceptedEvents.map((event) => (
          <TabsTab
            key={event.id}
            value={`event-${event.id}`}
            leftSection={<IconCalendarEvent size={16} />}
            component={Link}
            href={`/events/${event.id}`}
            style={{ textDecoration: "none" }}
          >
            {event.name}
          </TabsTab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
