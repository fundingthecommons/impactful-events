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
}: NavigationTabsProps) {
  return (
    <Tabs value={activeTab} color={color}>
      <Tabs.List>{children}</Tabs.List>
    </Tabs>
  );
}
