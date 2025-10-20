"use client";

import { useSession } from "next-auth/react";
import { type Session } from "next-auth";
import {
  Container,
  Title,
  Grid,
  Card,
  Text,
  Stack,
  Group,
  Button,
  Badge,
  Progress,
  Alert,
  Paper,
  Avatar,
  ActionIcon,
  Tooltip,
  Tabs,
} from "@mantine/core";
import {
  IconUser,
  IconUsers,
  IconBulb,
  IconAlertCircle,
  IconExternalLink,
  IconBrandGithub,
  IconPlus,
  IconCheck,
  IconEdit,
  IconMapPin,
  IconBriefcase,
  IconClock,
  IconHeart,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconWorld,
  IconStar,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import Link from "next/link";

interface ResidentDashboardProps {
  eventId: string;
  eventName: string;
  userApplication: {
    status: string;
  } | null;
}

export default function ResidentDashboard({
  eventId,
  eventName,
  userApplication: _userApplication,
}: ResidentDashboardProps) {
  const { data: session } = useSession();

  // Get profile completion data
  const { data: profileCompletion } = api.profile.getProfileCompletion.useQuery();

  // Get current user's projects
  const { data: userProfile } = api.profile.getMyProfile.useQuery();

  // Get accepted residents
  const { data: residentsData } = api.application.getAcceptedResidents.useQuery({
    eventId,
  });

  // Get resident projects
  const { data: residentProjects } = api.application.getResidentProjects.useQuery({
    eventId,
  });

  const userProjects = userProfile?.projects ?? [];

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={1} mb="xs">
            Welcome to {eventName}!
          </Title>
          <Text c="dimmed">
            Your resident dashboard - connect, collaborate, and create amazing things together.
          </Text>
        </div>

        <Grid gutter="xl">
          {/* Profile Completion Widget */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <IconUser size={20} />
                  <Text fw={600}>Profile Completion</Text>
                </Group>
                <Badge
                  color={profileCompletion?.meetsThreshold ? "green" : "orange"}
                  variant="light"
                >
                  {profileCompletion?.percentage ?? 0}%
                </Badge>
              </Group>

              <Progress
                value={profileCompletion?.percentage ?? 0}
                color={profileCompletion?.meetsThreshold ? "green" : "orange"}
                size="lg"
                mb="md"
              />

              {profileCompletion?.meetsThreshold ? (
                <Alert icon={<IconCheck size={16} />} color="green" mb="md">
                  Great! Your profile is complete and visible to other residents.
                </Alert>
              ) : (
                <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
                  <Text size="sm">
                    <strong>Other residents will not be able to find you</strong> until you complete your profile 
                    (currently at {profileCompletion?.percentage ?? 0}%). Complete your profile to be visible 
                    in the participant directory.
                  </Text>
                </Alert>
              )}

              {profileCompletion && profileCompletion.missingFields.length > 0 && (
                <Stack gap="xs" mb="md">
                  <Text size="sm" fw={500}>Missing fields:</Text>
                  {profileCompletion.missingFields.slice(0, 3).map((field) => (
                    <Text key={field} size="xs" c="dimmed">
                      • {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Text>
                  ))}
                  {profileCompletion.missingFields.length > 3 && (
                    <Text size="xs" c="dimmed">
                      • And {profileCompletion.missingFields.length - 3} more...
                    </Text>
                  )}
                </Stack>
              )}

              <Button
                component={Link}
                href={`/profile/edit?from-event=${eventId}`}
                leftSection={<IconEdit size={16} />}
                variant={profileCompletion?.meetsThreshold ? "light" : "filled"}
                fullWidth
              >
                {profileCompletion?.meetsThreshold ? "Edit Profile" : "Complete Profile"}
              </Button>
            </Card>
          </Grid.Col>

          {/* Your Projects Widget */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <IconBulb size={20} />
                  <Text fw={600}>Your Projects</Text>
                </Group>
                <Badge variant="light">
                  {userProjects.length} project{userProjects.length !== 1 ? 's' : ''}
                </Badge>
              </Group>

              {userProjects.length === 0 ? (
                <Stack align="center" gap="md" py="xl">
                  <Text ta="center" c="dimmed">
                    No projects yet
                  </Text>
                  <Text ta="center" size="sm" c="dimmed">
                    Showcase your work by adding your projects to connect with other residents
                  </Text>
                  <Button
                    component={Link}
                    href={`/profile/edit?from-event=${eventId}`}
                    leftSection={<IconPlus size={16} />}
                    variant="light"
                  >
                    Add Your First Project
                  </Button>
                </Stack>
              ) : (
                <Stack gap="md">
                  {userProjects.slice(0, 2).map((project) => (
                    <Paper key={project.id} p="sm" withBorder>
                      <Group justify="space-between" align="flex-start">
                        <div style={{ flex: 1 }}>
                          <Group gap="xs" align="center">
                            <Text fw={500} size="sm" lineClamp={1} style={{ flex: 1 }}>
                              {project.title}
                            </Text>
                            {project.featured && (
                              <Tooltip label="Featured project">
                                <IconStar size={14} style={{ color: 'var(--mantine-color-yellow-6)' }} />
                              </Tooltip>
                            )}
                          </Group>
                          {project.description && (
                            <Text size="xs" c="dimmed" lineClamp={2}>
                              {project.description}
                            </Text>
                          )}
                        </div>
                        <Group gap="xs">
                          {project.liveUrl && (
                            <Tooltip label="View Live Demo">
                              <ActionIcon
                                component="a"
                                href={project.liveUrl}
                                target="_blank"
                                variant="light"
                                size="sm"
                              >
                                <IconExternalLink size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {project.githubUrl && (
                            <Tooltip label="View Source">
                              <ActionIcon
                                component="a"
                                href={project.githubUrl}
                                target="_blank"
                                variant="light"
                                size="sm"
                              >
                                <IconBrandGithub size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                  
                  <Group justify="space-between">
                    <Button
                      component={Link}
                      href={`/profile/edit?from-event=${eventId}`}
                      variant="light"
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                    >
                      Add Project
                    </Button>
                    {userProjects.length > 2 && (
                      <Button
                        component={Link}
                        href={`/profiles/${session?.user?.id}`}
                        variant="subtle"
                        size="xs"
                      >
                        View All ({userProjects.length})
                      </Button>
                    )}
                  </Group>
                </Stack>
              )}
            </Card>
          </Grid.Col>

          {/* Participants and Projects Tabs */}
          <Grid.Col span={12}>
            <Tabs defaultValue="participants" variant="outline">
              <Tabs.List grow>
                <Tabs.Tab value="participants" leftSection={<IconUsers size={20} />}>
                  Participants
                </Tabs.Tab>
                <Tabs.Tab value="projects" leftSection={<IconBulb size={20} />}>
                  Projects
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="participants" pt="lg">
                <ParticipantsTab 
                  residentsData={residentsData}
                  eventId={eventId}
                  session={session}
                />
              </Tabs.Panel>

              <Tabs.Panel value="projects" pt="lg">
                <ProjectsTab 
                  residentProjects={residentProjects}
                  eventId={eventId}
                />
              </Tabs.Panel>
            </Tabs>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

// Helper function for social icons
function getSocialIcon(url: string, type: 'github' | 'linkedin' | 'twitter' | 'website') {
  const icons = {
    github: IconBrandGithub,
    linkedin: IconBrandLinkedin,
    twitter: IconBrandTwitter,
    website: IconWorld,
  };
  const Icon = icons[type];
  return (
    <ActionIcon
      component="a"
      href={url}
      target="_blank"
      variant="light"
      size="sm"
      color="blue"
    >
      <Icon size={16} />
    </ActionIcon>
  );
}

interface ParticipantsTabProps {
  residentsData: {
    residents: Array<{
      user?: {
        id: string;
        name: string | null;
        image: string | null;
        profile?: {
          jobTitle?: string | null;
          company?: string | null;
          location?: string | null;
          bio?: string | null;
          skills?: string[];
          githubUrl?: string | null;
          linkedinUrl?: string | null;
          twitterUrl?: string | null;
          website?: string | null;
          availableForMentoring?: boolean | null;
          availableForHiring?: boolean | null;
          availableForOfficeHours?: boolean | null;
        } | null;
      } | null;
      completionPercentage: number;
    }>;
    visibleResidents: number;
    hiddenCount: number;
  } | undefined;
  session: Session | null;
  eventId: string;
}
function ParticipantsTab({ residentsData, session, eventId }: ParticipantsTabProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Text fw={600}>Event Participants</Text>
        </Group>
        <Group gap="xs">
          <Badge variant="light">
            {residentsData?.visibleResidents ?? 0} visible
          </Badge>
          {residentsData && residentsData.hiddenCount > 0 && (
            <Badge variant="outline" color="gray">
              {residentsData.hiddenCount} private
            </Badge>
          )}
          {session && (
            <Button component={Link} href={`/profile/edit?from-event=${eventId}`} size="xs" variant="light" leftSection={<IconEdit size={14} />}>
              Edit My Profile
            </Button>
          )}
        </Group>
      </Group>

      {residentsData && residentsData.hiddenCount > 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="blue" mb="md">
          <Text size="sm">
            <strong>{residentsData.hiddenCount} participants</strong> haven&apos;t completed their profiles yet.
            Complete your profile to help build our participant community!
          </Text>
        </Alert>
      )}

      {residentsData?.residents && residentsData.residents.length > 0 ? (
        <Grid>
          {residentsData.residents.map((resident) => (
            <Grid.Col key={resident.user?.id} span={{ base: 12, sm: 6, lg: 4 }}>
              <Card 
                shadow="sm" 
                padding="lg" 
                radius="md" 
                withBorder 
                h="100%"
                component={Link}
                href={`/profiles/${resident.user?.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Card.Section p="lg" pb="xs">
                  <Group gap="sm">
                    <Avatar
                      src={resident.user?.image}
                      size="lg"
                      radius="md"
                    />
                    <div style={{ flex: 1 }}>
                      <Text fw={600} size="lg" lineClamp={1}>
                        {resident.user?.name ?? "Anonymous"}
                      </Text>
                      {resident.user?.profile?.jobTitle && (
                        <Text size="sm" c="dimmed" lineClamp={1}>
                          {resident.user?.profile?.jobTitle}
                          {resident.user?.profile?.company && ` at ${resident.user?.profile?.company}`}
                        </Text>
                      )}
                    </div>
                  </Group>
                </Card.Section>

                <Card.Section px="lg" pb="xs">
                  {resident.user?.profile?.location && (
                    <Group gap={4} mb="xs">
                      <IconMapPin size={14} />
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {resident.user?.profile?.location}
                      </Text>
                    </Group>
                  )}

                  {resident.user?.profile?.bio && (
                    <Text size="sm" lineClamp={3} mb="xs">
                      {resident.user?.profile?.bio}
                    </Text>
                  )}

                  {resident.user?.profile?.skills && resident.user?.profile?.skills.length > 0 && (
                    <Group gap={4} mb="xs">
                      {resident.user?.profile?.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} size="xs" variant="light">
                          {skill}
                        </Badge>
                      ))}
                      {resident.user?.profile?.skills.length > 3 && (
                        <Badge size="xs" variant="outline" color="gray">
                          +{resident.user?.profile?.skills.length - 3}
                        </Badge>
                      )}
                    </Group>
                  )}
                </Card.Section>

                <Card.Section px="lg" pb="lg">
                  <Group justify="space-between" align="flex-end" h={40}>
                    <Group gap={4}>
                      {resident.user?.profile?.availableForMentoring && (
                        <Tooltip label="Available for mentoring">
                          <Badge
                            size="xs"
                            variant="light"
                            color="green"
                            leftSection={<IconHeart size={10} />}
                          >
                            Mentor
                          </Badge>
                        </Tooltip>
                      )}
                      {resident.user?.profile?.availableForHiring && (
                        <Tooltip label="Available for hiring">
                          <Badge
                            size="xs"
                            variant="light"
                            color="blue"
                            leftSection={<IconBriefcase size={10} />}
                          >
                            Hiring
                          </Badge>
                        </Tooltip>
                      )}
                      {resident.user?.profile?.availableForOfficeHours && (
                        <Tooltip label="Office hours available">
                          <Badge
                            size="xs"
                            variant="light"
                            color="orange"
                            leftSection={<IconClock size={10} />}
                          >
                            Office Hours
                          </Badge>
                        </Tooltip>
                      )}
                    </Group>

                    <Group gap={4}>
                      {resident.user?.profile?.githubUrl && getSocialIcon(resident.user?.profile?.githubUrl, 'github')}
                      {resident.user?.profile?.linkedinUrl && getSocialIcon(resident.user?.profile?.linkedinUrl, 'linkedin')}
                      {resident.user?.profile?.twitterUrl && getSocialIcon(resident.user?.profile?.twitterUrl, 'twitter')}
                      {resident.user?.profile?.website && getSocialIcon(resident.user?.profile?.website, 'website')}
                    </Group>
                  </Group>
                </Card.Section>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        <Stack align="center" gap="md" py="xl">
          <Text ta="center" c="dimmed">
            No visible participants yet
          </Text>
          <Text ta="center" size="sm" c="dimmed">
            Be the first to complete your profile and appear in the directory!
          </Text>
        </Stack>
      )}

      {residentsData && residentsData.visibleResidents > 8 && (
        <Group justify="center" mt="md">
          <Button
            component={Link}
            href="/profiles"
            variant="light"
          >
            View All Participants ({residentsData.visibleResidents})
          </Button>
        </Group>
      )}
    </Card>
  );
}

interface ProjectsTabProps {
  residentProjects: Array<{
    id: string;
    title: string;
    description: string | null;
    technologies: string[];
    liveUrl: string | null;
    githubUrl: string | null;
    profile: {
      user?: {
        id: string;
        name: string | null;
        image: string | null;
      } | null;
    };
  }> | undefined;
  eventId: string;
}

function ProjectsTab({ residentProjects, eventId }: ProjectsTabProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Text fw={600}>Participant Projects</Text>
        </Group>
        <Badge variant="light">
          {residentProjects?.length ?? 0} projects
        </Badge>
      </Group>

      {residentProjects && residentProjects.length > 0 ? (
        <Grid>
          {residentProjects.map((project) => (
            <Grid.Col key={project.id} span={{ base: 12, sm: 6, md: 4 }}>
              <Card shadow="xs" padding="md" radius="md" withBorder h="100%">
                <Stack gap="xs">
                  <Group justify="space-between" align="flex-start">
                    <Text fw={500} size="sm" lineClamp={1}>
                      {project.title}
                    </Text>
                    <Group gap="xs">
                      {project.liveUrl && (
                        <Tooltip label="View Demo">
                          <ActionIcon
                            component="a"
                            href={project.liveUrl}
                            target="_blank"
                            variant="light"
                            size="xs"
                          >
                            <IconExternalLink size={12} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {project.githubUrl && (
                        <Tooltip label="View Source">
                          <ActionIcon
                            component="a"
                            href={project.githubUrl}
                            target="_blank"
                            variant="light"
                            size="xs"
                          >
                            <IconBrandGithub size={12} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Group>

                  {project.description && (
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {project.description}
                    </Text>
                  )}

                  {project.technologies.length > 0 && (
                    <Group gap="xs">
                      {project.technologies.slice(0, 2).map((tech) => (
                        <Badge key={tech} size="xs" variant="outline">
                          {tech}
                        </Badge>
                      ))}
                      {project.technologies.length > 2 && (
                        <Badge size="xs" variant="outline" color="gray">
                          +{project.technologies.length - 2}
                        </Badge>
                      )}
                    </Group>
                  )}

                  <Group gap="xs" mt="auto">
                    <Avatar
                      src={project.profile.user?.image}
                      size="xs"
                      radius="xl"
                    />
                    <Text size="xs" c="dimmed">
                      {project.profile.user?.name ?? "Anonymous"}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        <Stack align="center" gap="md" py="xl">
          <Text ta="center" c="dimmed">
            No projects shared yet
          </Text>
          <Text ta="center" size="sm" c="dimmed">
            Be the first to showcase your work in the event!
          </Text>
          <Button
            component={Link}
            href={`/profile/edit?from-event=${eventId}`}
            variant="light"
            leftSection={<IconPlus size={16} />}
          >
            Add Your Project
          </Button>
        </Stack>
      )}

      {residentProjects && residentProjects.length > 6 && (
        <Group justify="center" mt="md">
          <Button
            component={Link}
            href="/projects"
            variant="light"
          >
            View All Projects ({residentProjects.length})
          </Button>
        </Group>
      )}
    </Card>
  );
}