"use client";

import { IconAddressBook, IconBuilding } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { NavigationContainer } from "./nav/NavigationContainer";
import { NavigationTabs } from "./nav/NavigationTabs";
import { NavigationTab } from "./nav/NavigationTab";

export default function CRMNavigation() {
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname.startsWith("/crm/contacts")) return "contacts";
    if (pathname.startsWith("/crm/organizations")) return "organizations";
    return null;
  };

  return (
    <NavigationContainer level="sub">
      <NavigationTabs activeTab={getActiveTab()} color="cyan" level="sub">
        <NavigationTab
          value="contacts"
          href="/crm/contacts"
          icon={<IconAddressBook size={16} />}
          level="sub"
        >
          Contacts
        </NavigationTab>

        <NavigationTab
          value="organizations"
          href="/crm/organizations"
          icon={<IconBuilding size={16} />}
          level="sub"
        >
          Organizations
        </NavigationTab>
      </NavigationTabs>
    </NavigationContainer>
  );
}
