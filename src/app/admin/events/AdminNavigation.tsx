"use client";

import { Tabs } from "@mantine/core";
import { IconDashboard, IconCalendarEvent, IconUsers, IconMail, IconAddressBook, IconFileImport, IconMapPin, IconMailOpened } from "@tabler/icons-react";
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
    if (pathname.startsWith("/admin/events")) return "events";
    if (pathname.startsWith("/admin/users")) return "users";
    if (pathname.startsWith("/admin/invitations")) return "invitations";
    if (pathname.startsWith("/admin/communications")) return "communications";
    if (pathname.startsWith("/admin/emails")) return "communications"; // Redirect old emails to communications
    if (pathname.startsWith("/contacts")) return "contacts";
    if (pathname.startsWith("/crypto-nomads-import")) return "import";
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
        
        <TabsTab 
          value="events" 
          leftSection={<IconCalendarEvent size={16} />}
          component={Link}
          href="/admin/events"
          style={{ textDecoration: 'none' }}
        >
          Events
        </TabsTab>
        
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
          value="communications" 
          leftSection={<IconMailOpened size={16} />}
          component={Link}
          href="/admin/communications"
          style={{ textDecoration: 'none' }}
        >
          Communications
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
        
        <TabsTab 
          value="import" 
          leftSection={<IconFileImport size={16} />}
          component={Link}
          href="/crypto-nomads-import"
          style={{ textDecoration: 'none' }}
        >
          Import
        </TabsTab>
      </Tabs.List>
    </Tabs>
  );
}
