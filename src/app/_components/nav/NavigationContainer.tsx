"use client";

import { Container } from "@mantine/core";
import { type ReactNode } from "react";

interface NavigationContainerProps {
  children: ReactNode;
  level?: "main" | "sub";
  withTopBorder?: boolean;
}

export function NavigationContainer({
  children,
  level = "main",
}: NavigationContainerProps) {
  if (level === "sub") {
    return (
      <Container size="xl" py="md">
        {children}
      </Container>
    );
  }

  return <>{children}</>;
}
