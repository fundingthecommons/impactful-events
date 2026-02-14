"use client";

import {
  IconMapPin,
  IconHeart,
  IconNews,
  IconHandStop,
  IconUsers,
  IconBulb,
  IconSparkles,
} from "@tabler/icons-react";
import { NavigationContainer } from "~/app/_components/nav/NavigationContainer";
import { NavigationTabs } from "~/app/_components/nav/NavigationTabs";
import { NavigationTab } from "~/app/_components/nav/NavigationTab";

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

  return (
    <NavigationContainer level="sub">
      <NavigationTabs activeTab={null} level="sub">
        <NavigationTab
          value="my-event"
          href={adminBasePath}
          icon={<IconMapPin size={16} />}
          level="sub"
        >
          My Event
        </NavigationTab>

        {featureFlags?.featureAsksOffers !== false && (
          <NavigationTab
            value="asks-offers"
            href={`${publicBasePath}/asks-offers`}
            icon={<IconHandStop size={16} />}
            level="sub"
          >
            Asks & Offers
          </NavigationTab>
        )}

        <NavigationTab
          value="participants"
          href={`${publicBasePath}/participants`}
          icon={<IconUsers size={16} />}
          level="sub"
        >
          Participants
        </NavigationTab>

        {featureFlags?.featureProjects !== false && (
          <NavigationTab
            value="event-projects"
            href={`${publicBasePath}/projects`}
            icon={<IconBulb size={16} />}
            level="sub"
          >
            Projects
          </NavigationTab>
        )}

        {featureFlags?.featureNewsfeed !== false && (
          <NavigationTab
            value="latest"
            href={`${publicBasePath}/latest`}
            icon={<IconNews size={16} />}
            level="sub"
          >
            Latest
          </NavigationTab>
        )}

        {featureFlags?.featurePraise !== false && (
          <NavigationTab
            value="praise"
            href={`${publicBasePath}/praise`}
            icon={<IconSparkles size={16} />}
            level="sub"
          >
            Praise
          </NavigationTab>
        )}

        {featureFlags?.featureImpactAnalytics !== false && (
          <NavigationTab
            value="impact"
            href={`${publicBasePath}/impact`}
            icon={<IconHeart size={16} />}
            level="sub"
          >
            Impact
          </NavigationTab>
        )}
      </NavigationTabs>
    </NavigationContainer>
  );
}
