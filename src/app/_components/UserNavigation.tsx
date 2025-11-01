"use client";

import { Tabs, Menu } from "@mantine/core";
import { IconMapPin, IconHeart, IconFolder, IconNews } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentPropsWithRef } from "react";
import { api } from "~/trpc/react";

// Proper type for Tab component with Link
type TabWithLinkProps = ComponentPropsWithRef<typeof Tabs.Tab> & {
  href?: string;
};

export default function UserNavigation() {
  const pathname = usePathname();

  // Fetch user's projects
  const { data: userProjects = [] } = api.project.getMyProjects.useQuery();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (pathname.startsWith("/praise")) return "praise";
    if (pathname.startsWith("/events/funding-commons-residency-2025/updates")) return "updates";
    if (pathname.startsWith("/events/funding-commons-residency-2025/projects")) return "projects";
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

        {/* Projects Dropdown */}
        <Menu trigger="hover" openDelay={100} closeDelay={400}>
          <Menu.Target>
            <TabsTab
              value="projects"
              leftSection={<IconFolder size={16} />}
              style={{ cursor: 'pointer' }}
            >
              Projects
            </TabsTab>
          </Menu.Target>
          <Menu.Dropdown>
            {userProjects.length > 0 ? (
              userProjects.map((project) => (
                <Menu.Item
                  key={project.id}
                  component={Link}
                  href={`/events/${project.eventId}/projects/${project.id}`}
                >
                  {project.title}
                </Menu.Item>
              ))
            ) : (
              <Menu.Item disabled>No projects yet</Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>

        <TabsTab
          value="updates"
          leftSection={<IconNews size={16} />}
          component={Link}
          href="/events/funding-commons-residency-2025/updates"
          style={{ textDecoration: 'none' }}
        >
          Updates
        </TabsTab>

        <TabsTab
          value="praise"
          leftSection={<IconHeart size={16} />}
          component={Link}
          href="https://platform.fundingthecommons.io/praise"
          style={{ textDecoration: 'none' }}
        >
          Praise
        </TabsTab>
      </Tabs.List>
    </Tabs>
  );
}
