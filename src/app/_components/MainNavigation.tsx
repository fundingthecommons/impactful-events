"use client";

import {
  IconHome,
  IconUsers,
  IconBulb,
  IconHeartHandshake,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { NavigationContainer } from "./nav/NavigationContainer";
import { NavigationTabs } from "./nav/NavigationTabs";
import { NavigationTab } from "./nav/NavigationTab";

interface AcceptedEvent {
  id: string;
  name: string;
  slug: string | null;
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

    // Check if on an event page (match by id or slug)
    for (const event of acceptedEvents) {
      if (
        pathname.startsWith(`/events/${event.id}`) ||
        (event.slug && pathname.startsWith(`/events/${event.slug}`))
      ) {
        return `event-${event.id}`;
      }
    }

    return null;
  };

  return (
    <NavigationContainer level="main">
      <NavigationTabs activeTab={getActiveTab()} level="main">
        <NavigationTab
          value="home"
          href="/"
          icon={<IconHome size={18} />}
        >
          Home
        </NavigationTab>

        <NavigationTab
          value="community"
          href="/community"
          icon={<IconHeartHandshake size={18} />}
        >
          Community
        </NavigationTab>

        <NavigationTab
          value="profiles"
          href="/profiles"
          icon={<IconUsers size={18} />}
        >
          Profiles
        </NavigationTab>

        <NavigationTab
          value="projects"
          href="/projects"
          icon={<IconBulb size={18} />}
        >
          Projects
        </NavigationTab>

        {/* Dynamic event tabs for accepted residents */}
        {acceptedEvents.map((event) => (
          <NavigationTab
            key={event.id}
            value={`event-${event.id}`}
            href={`/events/${event.slug ?? event.id}`}
            icon={<IconCalendarEvent size={18} />}
          >
            {event.name}
          </NavigationTab>
        ))}
      </NavigationTabs>
    </NavigationContainer>
  );
}
