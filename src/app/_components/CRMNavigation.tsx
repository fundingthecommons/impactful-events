"use client";

import { Tabs } from "@mantine/core";
import { IconAddressBook, IconBuilding } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentPropsWithRef } from "react";

type TabWithLinkProps = ComponentPropsWithRef<typeof Tabs.Tab> & {
  href?: string;
};

export default function CRMNavigation() {
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname.startsWith("/crm/contacts")) return "contacts";
    if (pathname.startsWith("/crm/organizations")) return "organizations";
    return null;
  };

  const TabsTab = Tabs.Tab as React.ComponentType<TabWithLinkProps>;

  return (
    <Tabs value={getActiveTab()} color="cyan">
      <Tabs.List>
        <TabsTab
          value="contacts"
          leftSection={<IconAddressBook size={16} />}
          component={Link}
          href="/crm/contacts"
          style={{ textDecoration: 'none' }}
        >
          Contacts
        </TabsTab>

        <TabsTab
          value="organizations"
          leftSection={<IconBuilding size={16} />}
          component={Link}
          href="/crm/organizations"
          style={{ textDecoration: 'none' }}
        >
          Organizations
        </TabsTab>
      </Tabs.List>
    </Tabs>
  );
}
