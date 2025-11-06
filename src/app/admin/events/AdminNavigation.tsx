"use client";

import { Tabs, Menu } from "@mantine/core";
import { IconDashboard, IconCalendarEvent, IconUsers, IconMail, IconAddressBook, IconMapPin, IconMailOpened, IconUserCircle, IconHeart, IconNews, IconBulb, IconSparkles } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentPropsWithRef } from "react";

// Proper type for Tab component with Link
type TabWithLinkProps = ComponentPropsWithRef<typeof Tabs.Tab> & {
  href?: string;
};

export default function AdminNavigation() {
  const pathname = usePathname();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
    if (pathname.startsWith("/admin/events/residency")) return "residency";
    if (pathname.startsWith("/admin/events") || pathname.startsWith("/admin/communications")) return "events";
    if (pathname.startsWith("/admin/profiles")) return "profiles";
    if (pathname.startsWith("/admin/users")) return "users";
    if (pathname.startsWith("/admin/invitations")) return "invitations";
    if (pathname.startsWith("/contacts")) return "contacts";
    // User navigation tabs
    if (pathname.startsWith("/events/funding-commons-residency-2025/praise")) return "praise";
    if (pathname.startsWith("/events/funding-commons-residency-2025/impact")) return "impact";
    if (pathname.startsWith("/events/funding-commons-residency-2025/timeline")) return "timeline";
    if (pathname.startsWith("/events/funding-commons-residency-2025/asks-offers")) return "asks-offers";
    if (pathname.startsWith("/events/funding-commons-residency-2025/participants")) return "participants";
    if (pathname.startsWith("/events/funding-commons-residency-2025/projects")) return "event-projects";
    if (pathname.startsWith("/events/funding-commons-residency-2025")) return "my-residency";
    return null;
  };

  const TabsTab = Tabs.Tab as React.ComponentType<TabWithLinkProps>;

  return (
    <Tabs value={getActiveTab()} color="blue">
      <Tabs.List>
        <TabsTab
          value="dashboard"
          leftSection={<IconDashboard size={16} />}
          component={Link}
          href="/admin"
          style={{ textDecoration: 'none' }}
        >
          Dashboard
        </TabsTab>

        {/* Events Dropdown */}
        <Menu trigger="hover" openDelay={100} closeDelay={400}>
          <Menu.Target>
            <TabsTab
              value="events"
              leftSection={<IconCalendarEvent size={16} />}
              style={{ cursor: 'pointer' }}
            >
              Events
            </TabsTab>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              component={Link}
              href="/admin/events"
              leftSection={<IconCalendarEvent size={16} />}
            >
              All Events
            </Menu.Item>
            <Menu.Item
              component={Link}
              href="/admin/communications"
              leftSection={<IconMailOpened size={16} />}
            >
              All Communications
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <TabsTab
          value="residency"
          leftSection={<IconMapPin size={16} />}
          component={Link}
          href="/admin/events/funding-commons-residency-2025/applications"
          style={{ textDecoration: 'none' }}
        >
          Residency
        </TabsTab>

        <TabsTab
          value="profiles"
          leftSection={<IconUserCircle size={16} />}
          component={Link}
          href="/admin/profiles"
          style={{ textDecoration: 'none' }}
        >
          Profiles
        </TabsTab>

        <TabsTab
          value="users"
          leftSection={<IconUsers size={16} />}
          component={Link}
          href="/admin/users"
          style={{ textDecoration: 'none' }}
        >
          Users
        </TabsTab>

        <TabsTab
          value="invitations"
          leftSection={<IconMail size={16} />}
          component={Link}
          href="/admin/invitations"
          style={{ textDecoration: 'none' }}
        >
          Invitations
        </TabsTab>

        <TabsTab
          value="contacts"
          leftSection={<IconAddressBook size={16} />}
          component={Link}
          href="/contacts"
          style={{ textDecoration: 'none' }}
        >
          Contacts
        </TabsTab>

        {/* User Navigation Items */}
        <TabsTab
          value="my-residency"
          leftSection={<IconMapPin size={16} />}
          component={Link}
          href="https://platform.fundingthecommons.io/events/funding-commons-residency-2025"
          style={{ textDecoration: 'none' }}
        >
          My Residency
        </TabsTab>

        <TabsTab
          value="asks-offers"
          leftSection={<IconHeart size={16} />}
          component={Link}
          href="/events/funding-commons-residency-2025/asks-offers"
          style={{ textDecoration: 'none' }}
        >
          Asks & Offers
        </TabsTab>

        <TabsTab
          value="participants"
          leftSection={<IconUsers size={16} />}
          component={Link}
          href="/events/funding-commons-residency-2025/participants"
          style={{ textDecoration: 'none' }}
        >
          Participants
        </TabsTab>

        <TabsTab
          value="event-projects"
          leftSection={<IconBulb size={16} />}
          component={Link}
          href="/events/funding-commons-residency-2025/projects"
          style={{ textDecoration: 'none' }}
        >
          Projects
        </TabsTab>

        <TabsTab
          value="timeline"
          leftSection={<IconNews size={16} />}
          component={Link}
          href="/events/funding-commons-residency-2025/timeline"
          style={{ textDecoration: 'none' }}
        >
          Timeline
        </TabsTab>

        <TabsTab
          value="praise"
          leftSection={<IconSparkles size={16} />}
          component={Link}
          href="/events/funding-commons-residency-2025/praise"
          style={{ textDecoration: 'none' }}
        >
          Praise
        </TabsTab>

        <TabsTab
          value="impact"
          leftSection={<IconHeart size={16} />}
          component={Link}
          href="/events/funding-commons-residency-2025/impact"
          style={{ textDecoration: 'none' }}
        >
          Impact
        </TabsTab>
      </Tabs.List>
    </Tabs>
  );
}
