"use client";
import { ActionIcon, Tooltip, Stack, Affix } from "@mantine/core";
import { IconBrandGithub, IconAlertCircle } from "@tabler/icons-react";
import Link from "next/link";

export function GitHubCorner() {
  return (
    <Affix position={{ bottom: 20, left: 20 }} style={{ zIndex: 1000 }}>
      <Stack gap="xs">
        <Tooltip label="View on GitHub" position="right">
          <ActionIcon
            component={Link}
            href="https://github.com/fundingthecommons/impactful-events"
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            variant="filled"
            color="dark"
            style={{
              transition: "transform 0.2s ease",
            }}
            styles={{
              root: {
                "&:hover": {
                  transform: "scale(1.1)",
                },
              },
            }}
          >
            <IconBrandGithub size={24} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Report an Issue" position="right">
          <ActionIcon
            component={Link}
            href="https://github.com/fundingthecommons/impactful-events/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            variant="outline"
            color="dark"
            style={{
              transition: "transform 0.2s ease",
            }}
            styles={{
              root: {
                "&:hover": {
                  transform: "scale(1.1)",
                },
              },
            }}
          >
            <IconAlertCircle size={24} />
          </ActionIcon>
        </Tooltip>
      </Stack>
    </Affix>
  );
}
