"use client";

import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { Loader, Center } from "@mantine/core";

// Import all dashboard components
import PublicHomepage from "./PublicHomepage";
import AdminDashboard from "../admin/AdminDashboard";
import ParticipantEventsClient from "../events/ParticipantEventsClient";
import SponsorDashboard from "./SponsorDashboard";
import MentorDashboard from "./MentorDashboard";
import OrganizerDashboard from "./OrganizerDashboard";
import DefaultUserDashboard from "./DefaultUserDashboard";

export default function RoleBasedHomepage() {
  const { data: session, status } = useSession();

  // Always call hooks - use enabled flag to control when they run
  const { data: userRoles, isLoading: rolesLoading } = api.role.getUserRoles.useQuery(
    undefined,
    { enabled: !!session?.user }
  );
  const { data: userApplications, isLoading: applicationsLoading } = api.application.getUserApplications.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  // Show loading while session is being determined
  if (status === "loading") {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader size="xl" />
      </Center>
    );
  }

  // Show public homepage for non-logged-in users
  if (!session?.user) {
    return <PublicHomepage />;
  }

  // Show loading while role data is being fetched
  if (rolesLoading || applicationsLoading) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader size="xl" />
      </Center>
    );
  }

  // Determine user's primary role and appropriate dashboard
  const userRole = session.user.role;
  const eventRoles = userRoles ?? [];
  const hasApplications = userApplications && userApplications.length > 0;

  // Debug logging to identify routing
  console.log("🔍 Dashboard routing debug:", {
    userRole,
    eventRoleCount: eventRoles.length,
    roleNames: eventRoles.map(role => role.role.name),
    hasApplications,
    applicationsCount: userApplications?.length ?? 0
  });

  // Admin/Staff get admin dashboard
  if (userRole === "admin" || userRole === "staff") {
    console.log("✅ Routing to: AdminDashboard");
    return <AdminDashboard />;
  }

  // Check for event-specific roles (prioritized by importance)
  const roleNames = eventRoles.map(role => role.role.name);
  
  // Organizers get organizer dashboard
  if (roleNames.includes("organizer")) {
    console.log("✅ Routing to: OrganizerDashboard");
    return <OrganizerDashboard />;
  }
  
  // Sponsors get sponsor dashboard  
  if (roleNames.includes("sponsor")) {
    console.log("✅ Routing to: SponsorDashboard");
    return <SponsorDashboard />;
  }
  
  // Mentors get mentor dashboard
  if (roleNames.includes("mentor")) {
    console.log("✅ Routing to: MentorDashboard");
    return <MentorDashboard />;
  }

  // Users with applications get participant view
  if (hasApplications) {
    console.log("✅ Routing to: ParticipantEventsClient");
    return <ParticipantEventsClient />;
  }

  // Everyone else gets the default user dashboard
  console.log("✅ Routing to: DefaultUserDashboard");
  return <DefaultUserDashboard />;
}