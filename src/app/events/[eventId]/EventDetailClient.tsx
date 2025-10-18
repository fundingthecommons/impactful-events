"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Container, 
  Title, 
  Text, 
  Card, 
  Group, 
  Stack, 
  Button,
  ThemeIcon,
  Badge,
  Divider,
  Paper,
  Tabs,
  Alert,
} from "@mantine/core";
import { 
  IconCalendarEvent,
  IconMapPin,
  IconClock,
  IconCheck,
  IconAlertCircle,
  IconEdit,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import DynamicApplicationForm from "~/app/_components/DynamicApplicationForm";
import { getEventContent } from "~/utils/eventContent";
import { type EventType } from "~/types/event";

type Application = {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WAITLISTED" | "CANCELLED";
  language: string;
  submittedAt: Date | null;
  responses: Array<{
    id: string;
    answer: string;
    question: {
      id: string;
      questionKey: string;
      questionEn: string;
      questionEs: string;
      questionType: string;
      required: boolean;
    };
  }>;
};

type Event = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  location: string | null;
  type: string;
  applications?: unknown[];
};

interface EventDetailClientProps {
  event: Event;
  userApplication: Application | null;
  userId: string;
  defaultTab?: string;
  language?: "en" | "es";
}

function getStatusColor(status: string) {
  switch (status) {
    case "DRAFT":
      return "gray";
    case "SUBMITTED":
      return "blue";
    case "UNDER_REVIEW":
      return "yellow";
    case "ACCEPTED":
      return "green";
    case "REJECTED":
      return "red";
    case "WAITLISTED":
      return "orange";
    default:
      return "gray";
  }
}

function getStatusMessage(status: string) {
  switch (status) {
    case "DRAFT":
      return "Your application is saved as a draft. Submit when you're ready!";
    case "SUBMITTED":
      return "Your application has been submitted and is pending review. You can still edit it until it's under review.";
    case "UNDER_REVIEW":
      return "Your application is currently under review by our team. Editing is no longer available.";
    case "ACCEPTED":
      return "Congratulations! Your application has been accepted.";
    case "REJECTED":
      return "Unfortunately, your application was not accepted this time.";
    case "WAITLISTED":
      return "You've been placed on the waitlist. We'll contact you if spots become available.";
    default:
      return "";
  }
}

export default function EventDetailClient({ 
  event, 
  userApplication, 
  userId: _userId,
  defaultTab,
  language = "en"
}: EventDetailClientProps) {
  // Get event-specific content
  const eventType = (event.type === 'residency' || event.type === 'hackathon') 
    ? event.type as EventType 
    : 'residency';
  const content = getEventContent(eventType);
  
  console.log("🔍 EventDetailClient props:", {
    event,
    userApplication,
    userId: _userId
  });
  const [activeTab, setActiveTab] = useState<string | null>(defaultTab ?? "overview");
  const { data: session } = useSession();

  // Check if user is a mentor for this event
  const { data: isMentor } = api.event.checkMentorRole.useQuery(
    { eventId: event.id },
    { enabled: !!session?.user }
  );

  // Get user's mentor application
  const { data: mentorApplication } = api.application.getApplication.useQuery(
    { 
      eventId: event.id,
      applicationType: "MENTOR" 
    },
    { enabled: !!session?.user }
  );

  // Get accepted participants (public)
  const { data: participants = [] } = api.application.getEventParticipants.useQuery({
    eventId: event.id
  });

  // Get projects from participants (public)
  const { data: projects = [] } = api.project.getEventProjects.useQuery({
    eventId: event.id
  });

  // Check if user is admin/staff
  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "staff";

  const utils = api.useUtils();

  // Format dates
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  };

  // Handle successful application submission
  const handleApplicationSubmitted = async () => {
    // Refetch data to update UI
    await utils.application.getApplication.invalidate({ eventId: event.id });
    await utils.application.getUserApplications.invalidate();
  };

  // Handle application update
  const handleApplicationUpdated = async () => {
    // No need to refetch on every auto-save - trust the optimistic updates
    // Only refetch on page load, explicit refresh, or form submission
    console.log('🔍 EventDetailClient: Application updated (no refetch needed)');
  };
  console.log("🔍 Debug info:", {
    hasUser: !!session?.user,
    userEmail: session?.user?.email,
    userApplication: userApplication,
    applicationStatus: userApplication?.status,
    shouldShowBanner: session?.user && userApplication?.status === "ACCEPTED"
  });
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Event Header */}
        <Card shadow="lg" padding="xl" radius="md" withBorder>
          <Group align="flex-start" gap="lg">
            <div className="hidden-mobile">
              <ThemeIcon size={80} radius="md" variant="gradient" gradient={{ from: 'blue', to: 'purple' }}>
                <IconCalendarEvent size={40} />
              </ThemeIcon>
            </div>
            
            <Stack gap="sm" style={{ flex: 1 }}>
              <Group justify="space-between" align="flex-start">
                <Title order={1} size="h1">
                  {event.name}
                </Title>
                <Badge size="lg" variant="light" tt="uppercase">
                  {event.type}
                </Badge>
              </Group>
              
              <Text size="lg" c="dimmed">
                {event.description}
              </Text>

              <Group gap="xl" mt="md">
                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" color="blue">
                    <IconClock size={16} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>Start Date</Text>
                    <Text size="xs" c="dimmed">{formatDate(event.startDate)}</Text>
                  </Stack>
                </Group>

                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" color="green">
                    <IconClock size={16} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>End Date</Text>
                    <Text size="xs" c="dimmed">{formatDate(event.endDate)}</Text>
                  </Stack>
                </Group>

                {event.location && (
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="orange">
                      <IconMapPin size={16} />
                    </ThemeIcon>
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>Location</Text>
                      <Text size="xs" c="dimmed">{event.location}</Text>
                    </Stack>
                  </Group>
                )}
              </Group>
            </Stack>
          </Group>
        </Card>

        {/* Application Status Alert */}
        {userApplication && (
          <Alert 
            color={getStatusColor(userApplication.status)}
            title={`Application Status: ${userApplication.status.replace("_", " ")}`}
            icon={userApplication.status === "ACCEPTED" ? <IconCheck /> : <IconAlertCircle />}
          >
            {getStatusMessage(userApplication.status)}
            {userApplication.submittedAt && (
              <Text size="sm" mt="xs" c="dimmed">
                Submitted on {formatDate(userApplication.submittedAt)}
              </Text>
            )}
            {userApplication.status === "ACCEPTED" && (
              <Group mt="md" gap="md">
                <Button
                  component="a"
                  href={`/events/${event.id}/onboarding`}
                  variant="light"
                  color="green"
                  leftSection={<IconEdit size={16} />}
                  size="sm"
                >
                  Complete Onboarding
                </Button>
                <Text size="sm" c="dimmed">
                  Please complete your onboarding form to finalize your participation.
                </Text>
              </Group>
            )}
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="overview">
              Event Overview
            </Tabs.Tab>
            <Tabs.Tab value="application">
              {userApplication ? "Manage Application" : "Apply Now"}
            </Tabs.Tab>
            <Tabs.Tab value="participants">
              Participants
              {participants.length > 0 && (
                <Badge size="sm" variant="light" ml="xs">
                  {participants.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="projects">
              Projects
              {projects.length > 0 && (
                <Badge size="sm" variant="light" ml="xs">
                  {projects.length}
                </Badge>
              )}
            </Tabs.Tab>
            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
            {(isMentor || isAdmin) && (
              <Tabs.Tab value="mentor">
                Mentor Dashboard
              </Tabs.Tab>
            )}
            <Tabs.Tab value="resources">
              Resources
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" mt="md">
            <Paper p="xl" radius="md" withBorder>
              <Stack gap="lg">
                <Title order={2}>About This Event</Title>
                <Text>
                  {event.description ?? "No detailed description available for this event."}
                </Text>
                
                <Divider />
                
                <Group gap="xl">
                  <Stack gap="xs">
                    <Text fw={500}>Duration</Text>
                    <Text c="dimmed">
                      {Math.ceil((event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                    </Text>
                  </Stack>
                  
                  <Stack gap="xs">
                    <Text fw={500}>Format</Text>
                    <Text c="dimmed">
                      {event.location ? "In-person" : "Online"}
                    </Text>
                  </Stack>
                </Group>

                {!userApplication && (
                  <>
                    <Divider />
                    <Button 
                      size="lg" 
                      onClick={() => setActiveTab("application")}
                      leftSection={<IconEdit size={16} />}
                    >
                      Start Your Application
                    </Button>
                  </>
                )}
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="application" mt="md">
            <Paper p="xl" radius="md" withBorder>
              {userApplication ? (
                <Stack gap="lg">
                  <Group justify="space-between">
                    <Title order={2}>Your Application</Title>
                    <Badge 
                      color={getStatusColor(userApplication.status)}
                      size="lg" 
                      variant="light"
                    >
                      {userApplication.status.replace("_", " ")}
                    </Badge>
                  </Group>
                  
                  <DynamicApplicationForm
                    eventId={event.id}
                    existingApplication={userApplication}
                    language={language}
                    userEmail={session?.user?.email ?? undefined}
                    applicationType={isMentor ? "MENTOR" : "RESIDENT"}
                    onSubmitted={handleApplicationSubmitted}
                    onUpdated={handleApplicationUpdated}
                  />
                </Stack>
              ) : (
                <Stack gap="lg">
                  <Title order={2}>
                    {language === "es" ? "Aplicar al Evento" : "Apply to Event"}
                  </Title>
                  <Text c="dimmed">
                    {language === "es" 
                      ? "Complete el formulario a continuación para aplicar a este evento."
                      : "Complete the form below to apply to this event."
                    }
                  </Text>
                  
                  <DynamicApplicationForm
                    eventId={event.id}
                    language={language}
                    userEmail={session?.user?.email ?? undefined}
                    applicationType={isMentor ? "MENTOR" : "RESIDENT"}
                    onSubmitted={handleApplicationSubmitted}
                    onUpdated={handleApplicationUpdated}
                  />
                </Stack>
              )}
            </Paper>
          </Tabs.Panel>

          {/* Mentor Dashboard Tab */}
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
          {(isMentor || isAdmin) && (
            <Tabs.Panel value="mentor" mt="md">
              <Paper p="xl" radius="md" withBorder>
                <Stack gap="lg">
                  <Title order={2}>Mentor Dashboard</Title>
                  <Text c="dimmed">
                    Welcome to your mentor dashboard. Here you can manage your mentorship activities and track resident progress.
                  </Text>
                  
                  <Divider />
                  
                  <Group gap="xl">
                    <Stack gap="xs">
                      <Text fw={500}>Your Role</Text>
                      <Text c="dimmed">
                        {isMentor ? "Mentor" : "Administrator"}
                      </Text>
                    </Stack>
                    
                    <Stack gap="xs">
                      <Text fw={500}>Mentorship Status</Text>
                      {mentorApplication ? (
                        <Badge 
                          color={mentorApplication.status === "ACCEPTED" ? "green" : 
                                 mentorApplication.status === "REJECTED" ? "red" :
                                 mentorApplication.status === "SUBMITTED" ? "blue" : "gray"} 
                          variant="light"
                        >
                          {mentorApplication.status.replace("_", " ").toLowerCase()}
                        </Badge>
                      ) : (
                        <Text c="dimmed">
                          {isMentor ? "Active Mentor" : isAdmin ? "Admin Access" : "Not Applied"}
                        </Text>
                      )}
                    </Stack>
                    
                    <Stack gap="xs">
                      <Text fw={500}>Access Level</Text>
                      <Text c="dimmed">
                        Full mentor privileges
                      </Text>
                    </Stack>
                  </Group>

                  <Divider />

                  <Stack gap="md">
                    <Text fw={500}>Mentor Application</Text>
                    <Group gap="md">
                      <Button
                        component="a"
                        href={`/events/${event.id}/mentor`}
                        variant="light"
                        color={mentorApplication?.status === "ACCEPTED" ? "green" : "blue"}
                        leftSection={<IconEdit size={16} />}
                      >
                        {mentorApplication?.status === "ACCEPTED" 
                          ? "View Mentor Profile"
                          : mentorApplication?.status === "REJECTED"
                          ? "Update Mentor Application" 
                          : mentorApplication?.status === "SUBMITTED"
                          ? "Edit Mentor Application"
                          : mentorApplication
                          ? "Continue Mentor Application"
                          : "Complete Mentor Application"
                        }
                      </Button>
                    </Group>
                  </Stack>

                  <Divider />
                  
                  <Text size="sm" c="dimmed">
                    More mentor features will be available soon. For now, you have full access to all event information and can bypass application restrictions.
                  </Text>
                </Stack>
              </Paper>
            </Tabs.Panel>
          )}

          {/* Participants Tab */}
          <Tabs.Panel value="participants" mt="md">
            <Paper p="xl" radius="md" withBorder>
              <Stack gap="lg">
                <Title order={2}>Event Participants</Title>
                {participants.length > 0 ? (
                  <>
                    <Text c="dimmed">
                      Meet the {participants.length} accepted {eventType === 'hackathon' ? 'participants' : 'residents'} joining this event.
                    </Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                      {participants.map((participant) => (
                        <Card key={participant.id} shadow="sm" padding="lg" radius="md" withBorder>
                          <Group align="flex-start" gap="md">
                            {participant.user?.image && (
                              <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                <img 
                                  src={participant.user.image} 
                                  alt={participant.user.name ?? 'Participant'} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                            )}
                            <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                              <Text fw={500} size="lg" truncate>
                                {participant.user?.name ?? 'Anonymous Participant'}
                              </Text>
                              {participant.user?.profile?.jobTitle && (
                                <Text size="sm" c="dimmed" truncate>
                                  {participant.user.profile.jobTitle}
                                  {participant.user.profile.company && ` at ${participant.user.profile.company}`}
                                </Text>
                              )}
                              {participant.user?.profile?.location && (
                                <Text size="sm" c="dimmed" truncate>
                                  📍 {participant.user.profile.location}
                                </Text>
                              )}
                              {participant.user?.profile?.bio && (
                                <Text size="sm" lineClamp={2}>
                                  {participant.user.profile.bio}
                                </Text>
                              )}
                              {(participant.user?.profile?.githubUrl ?? participant.user?.profile?.linkedinUrl ?? participant.user?.profile?.twitterUrl ?? participant.user?.profile?.website) && (
                                <Group gap="xs" mt="xs">
                                  {participant.user?.profile?.githubUrl && (
                                    <Button 
                                      component="a"
                                      href={participant.user.profile.githubUrl}
                                      target="_blank"
                                      variant="subtle"
                                      size="xs"
                                    >
                                      GitHub
                                    </Button>
                                  )}
                                  {participant.user?.profile?.linkedinUrl && (
                                    <Button 
                                      component="a"
                                      href={participant.user.profile.linkedinUrl}
                                      target="_blank"
                                      variant="subtle"
                                      size="xs"
                                    >
                                      LinkedIn
                                    </Button>
                                  )}
                                  {participant.user?.profile?.twitterUrl && (
                                    <Button 
                                      component="a"
                                      href={participant.user.profile.twitterUrl}
                                      target="_blank"
                                      variant="subtle"
                                      size="xs"
                                    >
                                      Twitter
                                    </Button>
                                  )}
                                  {participant.user?.profile?.website && (
                                    <Button 
                                      component="a"
                                      href={participant.user.profile.website}
                                      target="_blank"
                                      variant="subtle"
                                      size="xs"
                                    >
                                      Website
                                    </Button>
                                  )}
                                </Group>
                              )}
                            </Stack>
                          </Group>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <Text c="dimmed" ta="center" py="xl">
                    No participants to display yet. Participants will appear here once applications are accepted.
                  </Text>
                )}
              </Stack>
            </Paper>
          </Tabs.Panel>

          {/* Projects Tab */}
          <Tabs.Panel value="projects" mt="md">
            <Paper p="xl" radius="md" withBorder>
              <Stack gap="lg">
                <Title order={2}>{eventType === 'hackathon' ? 'Hackathon Projects' : 'Participant Projects'}</Title>
                {projects.length > 0 ? (
                  <>
                    <Text c="dimmed">
                      Explore {projects.length} projects created by event participants.
                    </Text>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                      {projects.map((project) => (
                        <Card key={project.id} shadow="sm" padding="lg" radius="md" withBorder>
                          <Stack gap="md">
                            {project.imageUrl && (
                              <div style={{ width: '100%', height: 200, borderRadius: 8, overflow: 'hidden' }}>
                                <img 
                                  src={project.imageUrl} 
                                  alt={project.title} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                            )}
                            <div>
                              <Group justify="space-between" align="flex-start" mb="xs">
                                <Text fw={500} size="lg" lineClamp={1}>
                                  {project.title}
                                </Text>
                                {project.featured && (
                                  <Badge variant="light" color="yellow" size="sm">
                                    Featured
                                  </Badge>
                                )}
                              </Group>
                              {project.description && (
                                <Text size="sm" c="dimmed" lineClamp={3} mb="sm">
                                  {project.description}
                                </Text>
                              )}
                              <Group gap="xs" mb="sm">
                                <div style={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden' }}>
                                  {project.author.image ? (
                                    <img 
                                      src={project.author.image} 
                                      alt={project.author.name ?? 'Author'} 
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', backgroundColor: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Text size="xs">?</Text>
                                    </div>
                                  )}
                                </div>
                                <Text size="sm" c="dimmed">
                                  by {project.author.name ?? 'Anonymous'}
                                </Text>
                              </Group>
                              {project.technologies && project.technologies.length > 0 && (
                                <Group gap="xs" mb="sm">
                                  {project.technologies.slice(0, 3).map((tech, index) => (
                                    <Badge key={index} variant="outline" size="xs">
                                      {tech}
                                    </Badge>
                                  ))}
                                  {project.technologies.length > 3 && (
                                    <Badge variant="outline" size="xs" color="gray">
                                      +{project.technologies.length - 3} more
                                    </Badge>
                                  )}
                                </Group>
                              )}
                              <Group gap="xs">
                                {project.githubUrl && (
                                  <Button 
                                    component="a"
                                    href={project.githubUrl}
                                    target="_blank"
                                    variant="light"
                                    size="xs"
                                  >
                                    View Code
                                  </Button>
                                )}
                                {project.liveUrl && (
                                  <Button 
                                    component="a"
                                    href={project.liveUrl}
                                    target="_blank"
                                    variant="filled"
                                    size="xs"
                                  >
                                    Live Demo
                                  </Button>
                                )}
                              </Group>
                            </div>
                          </Stack>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <Text c="dimmed" ta="center" py="xl">
                    No projects to display yet. Projects will appear here as participants add them to their profiles.
                  </Text>
                )}
              </Stack>
            </Paper>
          </Tabs.Panel>

          {/* Resources Tab */}
          <Tabs.Panel value="resources" mt="md">
            <Paper p="xl" radius="md" withBorder>
              <Stack gap="lg">
                <Title order={2}>Event Resources</Title>
                
                <Stack gap="md">
                  <Text fw={500}>Program Information</Text>
                  <Group gap="md">
                    <Button
                      component="a"
                      href={`/events/${event.id}/about`}
                      variant="light"
                      color={content.branding.colors.primary}
                    >
                      About the {eventType === 'hackathon' ? 'Hackathon' : 'Residency'}
                    </Button>
                    <Button
                      component="a"
                      href={`/events/${event.id}/faq`}
                      variant="light"
                      color={content.branding.colors.secondary}
                    >
                      Frequently Asked Questions
                    </Button>
                  </Group>
                </Stack>

                <Divider />

                <Stack gap="md">
                  <Text fw={500}>External Links</Text>
                  <Group gap="md">
                    <Button
                      component="a"
                      href="https://fundingthecommons.io"
                      target="_blank"
                      variant="outline"
                      color="gray"
                    >
                      Funding the Commons Website
                    </Button>
                  </Group>
                </Stack>

                <Divider />

                <Text size="sm" c="dimmed">
                  Additional resources and documentation will be made available as the program progresses.
                </Text>
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}