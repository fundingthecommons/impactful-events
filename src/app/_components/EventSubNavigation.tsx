"use client";

import {
  IconMapPin,
  IconHeart,
  IconNews,
  IconHandStop,
  IconUsers,
  IconBulb,
  IconCalendarEvent,
  IconSettings,
  IconMicrophone,
  IconSparkles,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { api } from "~/trpc/react";
import { NavigationContainer } from "./nav/NavigationContainer";
import { NavigationTabs } from "./nav/NavigationTabs";
import { NavigationTab } from "./nav/NavigationTab";
import { SubNavigationHeader } from "./nav/SubNavigationHeader";

interface EventSubNavigationProps {
  eventId: string;
  eventName?: string;
  featureFlags?: {
    featureAsksOffers: boolean;
    featureProjects: boolean;
    featureNewsfeed: boolean;
    featureImpactAnalytics: boolean;
    featurePraise?: boolean;
    featureScheduleManagement?: boolean;
    featureSpeakerVetting?: boolean;
  };
  isFloorOwner?: boolean;
  isAdmin?: boolean;
  /** When provided, renders the "My Event" tab linking to this admin path */
  adminBasePath?: string;
}

export default function EventSubNavigation({
  eventId,
  eventName,
  featureFlags,
  isFloorOwner,
  isAdmin,
  adminBasePath,
}: EventSubNavigationProps) {
  const pathname = usePathname();
  const basePath = `/events/${eventId}`;
  const { data: session } = useSession();

  // Client-side fallback: only fires when server-side check missed floor ownership
  const shouldCheckClientSide =
    !isFloorOwner &&
    !isAdmin &&
    !!session?.user &&
    featureFlags?.featureScheduleManagement !== false;

  const { data: clientIsFloorOwner } = api.schedule.isFloorOwner.useQuery(
    { eventId },
    { enabled: shouldCheckClientSide },
  );

  // Determine active tab based on current path
  // Handles both /events/[eventId]/ and /admin/events/[eventId]/ paths
  const getActiveTab = () => {
    // Check admin path first
    if (adminBasePath && (pathname === adminBasePath || pathname === `${adminBasePath}/`)) {
      return "my-event";
    }
    const match = /^\/events\/[^/]+(\/.*)?$/.exec(pathname);
    const subPath = match?.[1] ?? "";
    if (subPath.startsWith("/speakers")) return "speakers";
    if (subPath.startsWith("/manage-schedule")) return "manage-schedule";
    if (subPath.startsWith("/schedule")) return "schedule";
    if (subPath.startsWith("/impact")) return "impact";
    if (subPath.startsWith("/latest")) return "latest";
    if (subPath.startsWith("/praise")) return "praise";
    if (subPath.startsWith("/asks-offers")) return "asks-offers";
    if (subPath.startsWith("/participants")) return "participants";
    if (subPath.startsWith("/projects")) return "event-projects";
    if (subPath === "" || subPath === "/") return "my-event";
    return null;
  };

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const isEffectiveFloorOwner = isFloorOwner || clientIsFloorOwner === true;
  const showManageSchedule =
    isEffectiveFloorOwner ||
    (isAdmin && featureFlags?.featureScheduleManagement !== false);

  const myEventHref = adminBasePath ?? basePath;

  return (
    <>
      {eventName && <SubNavigationHeader title={eventName} />}
      <NavigationContainer level="sub" withTopBorder={!eventName}>
        <NavigationTabs activeTab={getActiveTab()} level="sub">
          <NavigationTab
            value="my-event"
            href={myEventHref}
            icon={<IconMapPin size={16} />}
            level="sub"
          >
            My Event
          </NavigationTab>

          <NavigationTab
            value="schedule"
            href={`${basePath}/schedule`}
            icon={<IconCalendarEvent size={16} />}
            level="sub"
          >
            Schedule
          </NavigationTab>

          {featureFlags?.featureNewsfeed !== false && (
            <NavigationTab
              value="latest"
              href={`${basePath}/latest`}
              icon={<IconNews size={16} />}
              level="sub"
            >
              Latest
            </NavigationTab>
          )}

          {featureFlags?.featureAsksOffers !== false && (
            <NavigationTab
              value="asks-offers"
              href={`${basePath}/asks-offers`}
              icon={<IconHandStop size={16} />}
              level="sub"
            >
              Asks & Offers
            </NavigationTab>
          )}

          <NavigationTab
            value="participants"
            href={`${basePath}/participants`}
            icon={<IconUsers size={16} />}
            level="sub"
          >
            Participants
          </NavigationTab>

          {featureFlags?.featureProjects !== false && (
            <NavigationTab
              value="event-projects"
              href={`${basePath}/projects`}
              icon={<IconBulb size={16} />}
              level="sub"
            >
              Projects
            </NavigationTab>
          )}

          {featureFlags?.featurePraise !== false && (
            <NavigationTab
              value="praise"
              href={`${basePath}/praise`}
              icon={<IconSparkles size={16} />}
              level="sub"
            >
              Praise
            </NavigationTab>
          )}

          {featureFlags?.featureImpactAnalytics !== false && (
            <NavigationTab
              value="impact"
              href={`${basePath}/impact`}
              icon={<IconHeart size={16} />}
              level="sub"
            >
              Impact
            </NavigationTab>
          )}

          {showManageSchedule && (
            <NavigationTab
              value="manage-schedule"
              href={`${basePath}/manage-schedule`}
              icon={<IconSettings size={16} />}
              level="sub"
            >
              Manage Floors
            </NavigationTab>
          )}

          {showManageSchedule && featureFlags?.featureSpeakerVetting !== false && (
            <NavigationTab
              value="speakers"
              href={`${basePath}/speakers`}
              icon={<IconMicrophone size={16} />}
              level="sub"
            >
              Speakers
            </NavigationTab>
          )}
        </NavigationTabs>
      </NavigationContainer>
    </>
  );
}
