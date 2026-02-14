"use client";

import { Menu, Tabs } from "@mantine/core";
import { IconDashboard, IconCalendarEvent, IconUsers, IconMailOpened, IconChartBar } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationContainer } from "~/app/_components/nav/NavigationContainer";
import { NavigationTabs } from "~/app/_components/nav/NavigationTabs";
import { NavigationTab } from "~/app/_components/nav/NavigationTab";
import { type ComponentPropsWithRef } from "react";

type TabWithLinkProps = ComponentPropsWithRef<typeof Tabs.Tab> & {
  href?: string;
};

export default function AdminNavigation() {
  const pathname = usePathname();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
    if (pathname.startsWith("/admin/events") || pathname.startsWith("/admin/communications")) return "events";
    if (pathname.startsWith("/admin/users")) return "users";
    if (pathname.startsWith("/impact-reports")) return "impact-reports";
    return null;
  };

  const TabsTab = Tabs.Tab as React.ComponentType<TabWithLinkProps>;

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

        {/* Events Dropdown - keep Menu for now as it has dropdown functionality */}
        <Menu trigger="hover" openDelay={100} closeDelay={400}>
          <Menu.Target>
            <TabsTab
              value="events"
              leftSection={<IconCalendarEvent size={18} />}
              className="cursor-pointer px-6 py-4"
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
      </NavigationTabs>
    </NavigationContainer>
  );
}
