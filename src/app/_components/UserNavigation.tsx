"use client";

import { Tabs } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentPropsWithRef } from "react";

// Proper type for Tab component with Link
type TabWithLinkProps = ComponentPropsWithRef<typeof Tabs.Tab> & {
  href?: string;
};

export default function UserNavigation() {
  const pathname = usePathname();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (pathname.startsWith("/events/funding-commons-residency-2025")) return "residency";
    return null;
  };

  const TabsTab = Tabs.Tab as React.ComponentType<TabWithLinkProps>;

  return (
    <Tabs value={getActiveTab()} color="blue">
      <Tabs.List>
        <TabsTab
          value="residency"
          leftSection={<IconMapPin size={16} />}
          component={Link}
          href="https://platform.fundingthecommons.io/events/funding-commons-residency-2025"
          style={{ textDecoration: 'none' }}
        >
          Residency
        </TabsTab>
      </Tabs.List>
    </Tabs>
  );
}
