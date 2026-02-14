"use client";

import { Paper } from "@mantine/core";
import { type ReactNode } from "react";

interface NavigationContainerProps {
  children: ReactNode;
  level?: "main" | "sub";
  withTopBorder?: boolean;
}

export function NavigationContainer({
  children,
  level = "main",
  withTopBorder = false,
}: NavigationContainerProps) {
  return (
    <Paper
      radius={0}
      className={level === "main" ? "bg-nav-bg-main" : "bg-nav-bg-sub"}
      style={{
        borderTop: withTopBorder ? "1px solid var(--color-nav-border)" : 0,
        borderBottom: "1px solid var(--color-nav-border)",
        boxShadow: level === "main" ? "0 1px 3px 0 rgba(0, 0, 0, 0.02)" : "none",
      }}
    >
      {children}
    </Paper>
  );
}
