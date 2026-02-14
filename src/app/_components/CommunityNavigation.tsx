"use client";

import { IconHome, IconUsers, IconBulb, IconHeartHandshake } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { NavigationContainer } from "./nav/NavigationContainer";
import { NavigationTabs } from "./nav/NavigationTabs";
import { NavigationTab } from "./nav/NavigationTab";

export default function CommunityNavigation() {
  const pathname = usePathname();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/community")) return "community";
    if (pathname.startsWith("/profiles")) return "profiles";
    if (pathname.startsWith("/projects")) return "projects";
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
      </NavigationTabs>
    </NavigationContainer>
  );
}
