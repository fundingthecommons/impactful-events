"use client";

import { Group, Badge, Tooltip } from "@mantine/core";
import { getKudosTier, KUDOS_CONSTANTS } from "~/utils/kudosCalculation";

interface UserMetricsBadgesProps {
  kudos: number;
  updates: number;
  projects: number;
  praiseReceived: number;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "light" | "filled" | "outline";
  showLabels?: boolean;
  compact?: boolean;
}

/**
 * Displays Stack Overflow-style user metrics badges
 * Shows kudos score and activity metrics with color-coded tiers
 */
export function UserMetricsBadges({
  kudos,
  updates,
  projects,
  praiseReceived,
  size = "sm",
  variant = "light",
  showLabels = false,
  compact = false,
}: UserMetricsBadgesProps) {
  const tier = getKudosTier(kudos);
  const roundedKudos = Math.round(kudos);

  // Compact mode: only show kudos
  if (compact) {
    return (
      <Tooltip label={tier.label} withArrow>
        <Badge size={size} variant={variant} color={tier.color}>
          {roundedKudos}
        </Badge>
      </Tooltip>
    );
  }

  return (
    <Group gap="xs" wrap="nowrap">
      {/* Kudos Score - Main metric */}
      <Tooltip
        label={`${roundedKudos} Kudos - ${tier.label}`}
        withArrow
        multiline
        w={200}
      >
        <Badge size={size} variant={variant} color={tier.color}>
          {showLabels ? `${roundedKudos} kudos` : roundedKudos}
        </Badge>
      </Tooltip>

      {/* Updates Count - Gold tier activity */}
      <Tooltip
        label={`${updates} updates (+${updates * KUDOS_CONSTANTS.UPDATE_WEIGHT} kudos)`}
        withArrow
      >
        <Badge size={size} variant="light" color="yellow">
          {showLabels ? `${updates} updates` : updates}
        </Badge>
      </Tooltip>

      {/* Projects with Metrics - Silver tier activity */}
      <Tooltip
        label={`${projects} projects with metrics (+${projects * KUDOS_CONSTANTS.METRICS_WEIGHT} kudos)`}
        withArrow
      >
        <Badge size={size} variant="light" color="grape">
          {showLabels ? `${projects} projects` : projects}
        </Badge>
      </Tooltip>

      {/* Praise Received - Bronze tier activity */}
      <Tooltip
        label={`${praiseReceived} praise received (+${praiseReceived * KUDOS_CONSTANTS.BACKFILL_PRAISE_VALUE} kudos)`}
        withArrow
      >
        <Badge size={size} variant="light" color="green">
          {showLabels ? `${praiseReceived} praise` : praiseReceived}
        </Badge>
      </Tooltip>
    </Group>
  );
}
