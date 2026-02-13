"use client";

import { Tabs, Menu } from "@mantine/core";
import { IconDashboard, IconCalendarEvent, IconUsers, IconMail, IconMapPin, IconMailOpened, IconChartBar } from "@tabler/icons-react";
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
    if (pathname.startsWith("/admin/users")) return "users";
    if (pathname.startsWith("/admin/invitations")) return "invitations";
    if (pathname.startsWith("/impact-reports")) return "impact-reports";
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
          value="impact-reports"
          leftSection={<IconChartBar size={16} />}
          component={Link}
          href="/impact-reports"
          style={{ textDecoration: 'none' }}
        >
          Impact Reports
        </TabsTab>
      </Tabs.List>
    </Tabs>
  );
}
