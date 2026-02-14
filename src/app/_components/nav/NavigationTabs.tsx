"use client";

import { Tabs } from "@mantine/core";
import { type ReactNode } from "react";

interface NavigationTabsProps {
  children: ReactNode;
  activeTab: string | null;
  color?: string;
  level?: "main" | "sub";
}

export function NavigationTabs({
  children,
  activeTab,
  color = "blue",
  level = "main",
}: NavigationTabsProps) {
  return (
    <Tabs
      value={activeTab}
      color={color}
      classNames={{
        root: "border-none",
        list: level === "main" 
          ? "border-none gap-1 px-8 py-0" 
          : "border-none gap-1 px-8 py-0",
        tab: level === "main"
          ? "px-6 py-4 text-sm font-medium transition-all data-[active]:bg-nav-tab-active-bg data-[active]:text-nav-text-active hover:bg-nav-tab-hover rounded-t-md border-b-2 border-transparent data-[active]:border-nav-tab-active-border"
          : "px-5 py-3 text-sm font-medium transition-all data-[active]:bg-nav-tab-active-bg data-[active]:text-nav-text-active hover:bg-nav-tab-hover rounded-md",
        tabLabel: "text-nav-text data-[active]:text-nav-text-active",
        tabSection: "text-nav-text-muted data-[active]:text-nav-text-active",
      }}
    >
      <Tabs.List>{children}</Tabs.List>
    </Tabs>
  );
}
