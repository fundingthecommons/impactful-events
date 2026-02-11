"use client";

import { Paper, Tabs } from "@mantine/core";
import {
  IconMapPin,
  IconHeart,
  IconNews,
  IconHandStop,
  IconUsers,
  IconBulb,
  IconSparkles,
  IconBuilding,
} from "@tabler/icons-react";
import Link from "next/link";
import { type ComponentPropsWithRef } from "react";

// Proper type for Tab component with Link
type TabWithLinkProps = ComponentPropsWithRef<typeof Tabs.Tab> & {
  href?: string;
};

interface AdminEventSubNavigationProps {
  eventId: string;
  featureFlags?: {
    featureAsksOffers: boolean;
    featureProjects: boolean;
    featureNewsfeed: boolean;
    featurePraise: boolean;
    featureImpactAnalytics: boolean;
  };
}

export default function AdminEventSubNavigation({ eventId, featureFlags }: AdminEventSubNavigationProps) {
  const adminBasePath = `/admin/events/${eventId}`;
  const publicBasePath = `/events/${eventId}`;

  const TabsTab = Tabs.Tab as React.ComponentType<TabWithLinkProps>;

  return (
    <Paper
      radius={0}
      px="lg"
      style={{
        borderTop: 0,
        borderLeft: "1px solid var(--mantine-color-default-border)",
        borderRight: "1px solid var(--mantine-color-default-border)",
        borderBottom: "1px solid var(--mantine-color-default-border)",
        background: "var(--theme-surface-secondary, var(--mantine-color-gray-0))",
      }}
    >
      <Tabs value={null} color="blue" variant="default">
        <Tabs.List style={{ borderBottom: 0 }}>
          <TabsTab
            value="my-event"
            leftSection={<IconMapPin size={14} />}
            component={Link}
            href={adminBasePath}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            My Event
          </TabsTab>

          {featureFlags?.featureAsksOffers !== false && (
            <TabsTab
              value="asks-offers"
              leftSection={<IconHandStop size={14} />}
              component={Link}
              href={`${publicBasePath}/asks-offers`}
              style={{ textDecoration: "none", fontSize: "0.875rem" }}
            >
              Asks & Offers
            </TabsTab>
          )}

          <TabsTab
            value="participants"
            leftSection={<IconUsers size={14} />}
            component={Link}
            href={`${publicBasePath}/participants`}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            Participants
          </TabsTab>

          {featureFlags?.featureProjects !== false && (
            <TabsTab
              value="event-projects"
              leftSection={<IconBulb size={14} />}
              component={Link}
              href={`${publicBasePath}/projects`}
              style={{ textDecoration: "none", fontSize: "0.875rem" }}
            >
              Projects
            </TabsTab>
          )}

          {featureFlags?.featureNewsfeed !== false && (
            <TabsTab
              value="latest"
              leftSection={<IconNews size={14} />}
              component={Link}
              href={`${publicBasePath}/latest`}
              style={{ textDecoration: "none", fontSize: "0.875rem" }}
            >
              Latest
            </TabsTab>
          )}

          {featureFlags?.featurePraise !== false && (
            <TabsTab
              value="praise"
              leftSection={<IconSparkles size={14} />}
              component={Link}
              href={`${publicBasePath}/praise`}
              style={{ textDecoration: "none", fontSize: "0.875rem" }}
            >
              Praise
            </TabsTab>
          )}

          {featureFlags?.featureImpactAnalytics !== false && (
            <TabsTab
              value="impact"
              leftSection={<IconHeart size={14} />}
              component={Link}
              href={`${publicBasePath}/impact`}
              style={{ textDecoration: "none", fontSize: "0.875rem" }}
            >
              Impact
            </TabsTab>
          )}

          <TabsTab
            value="floor-owners"
            leftSection={<IconBuilding size={14} />}
            component={Link}
            href={`${adminBasePath}/floor-owners`}
            style={{ textDecoration: "none", fontSize: "0.875rem" }}
          >
            Floor Owners
          </TabsTab>
        </Tabs.List>
      </Tabs>
    </Paper>
  );
}
