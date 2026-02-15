"use client";

import { IconDashboard, IconCalendarEvent, IconUsers, IconChartBar } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { NavigationContainer } from "~/app/_components/nav/NavigationContainer";
import { NavigationTabs } from "~/app/_components/nav/NavigationTabs";
import { NavigationTab } from "~/app/_components/nav/NavigationTab";

interface AcceptedEvent {
  id: string;
  name: string;
  slug: string | null;
}

interface AdminNavigationProps {
  acceptedEvents?: AcceptedEvent[];
}

export default function AdminNavigation({ acceptedEvents = [] }: AdminNavigationProps) {
  const pathname = usePathname();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
    if (pathname.startsWith("/admin/events")) return "events";
    if (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/communications")) return "users";
    if (pathname.startsWith("/impact-reports")) return "impact-reports";

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
          value="dashboard"
          href="/admin"
          icon={<IconDashboard size={18} />}
        >
          Dashboard
        </NavigationTab>

        <NavigationTab
          value="events"
          href="/admin/events"
          icon={<IconCalendarEvent size={18} />}
        >
          Events
        </NavigationTab>

        <NavigationTab
          value="users"
          href="/admin/users"
          icon={<IconUsers size={18} />}
        >
          Users
        </NavigationTab>

        <NavigationTab
          value="impact-reports"
          href="/impact-reports"
          icon={<IconChartBar size={18} />}
        >
          Impact Reports
        </NavigationTab>

        {/* Dynamic event tabs */}
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
