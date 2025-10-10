"use client";

import { useSession } from "next-auth/react";
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
  const featuredProjects = userProjects.filter(p => p.featured);

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
                <Alert icon={<IconAlertCircle size={16} />} color="orange" mb="md">
                  Complete your profile to connect with other residents and showcase your work.
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
                href="/profile/edit"
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
                  {featuredProjects.length} featured
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
                    href="/profile/edit"
                    leftSection={<IconPlus size={16} />}
                    variant="light"
                  >
                    Add Your First Project
                  </Button>
                </Stack>
              ) : (
                <Stack gap="md">
                  {featuredProjects.slice(0, 2).map((project) => (
                    <Paper key={project.id} p="sm" withBorder>
                      <Group justify="space-between" align="flex-start">
                        <div style={{ flex: 1 }}>
                          <Text fw={500} size="sm" lineClamp={1}>
                            {project.title}
                          </Text>
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
                      href="/profile/edit"
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

          {/* Fellow Residents Directory */}
          <Grid.Col span={12}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <IconUsers size={20} />
                  <Text fw={600}>Fellow Residents</Text>
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
                </Group>
              </Group>

              {residentsData && residentsData.hiddenCount > 0 && (
                <Alert icon={<IconAlertCircle size={16} />} color="blue" mb="md">
                  <Text size="sm">
                    <strong>{residentsData.hiddenCount} residents</strong> haven&apos;t completed their profiles yet.
                    Complete your profile above to help build our resident community!
                  </Text>
                </Alert>
              )}

              {residentsData?.residents && residentsData.residents.length > 0 ? (
                <Grid>
                  {residentsData.residents.slice(0, 8).map((resident) => (
                    <Grid.Col key={resident.user?.id} span={{ base: 6, sm: 4, md: 3 }}>
                      <Card
                        component={Link}
                        href={`/profiles/${resident.user?.id}`}
                        shadow="xs"
                        padding="md"
                        radius="md"
                        withBorder
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <Stack align="center" gap="xs">
                          <Avatar
                            src={resident.user?.image}
                            size="md"
                            radius="xl"
                          />
                          <Text fw={500} size="sm" ta="center" lineClamp={1}>
                            {resident.user?.name ?? "Anonymous"}
                          </Text>
                          {resident.user?.profile?.jobTitle && (
                            <Text size="xs" c="dimmed" ta="center" lineClamp={1}>
                              {resident.user?.profile?.jobTitle}
                            </Text>
                          )}
                          <Badge size="xs" variant="light">
                            {resident.completionPercentage}% complete
                          </Badge>
                        </Stack>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              ) : (
                <Stack align="center" gap="md" py="xl">
                  <Text ta="center" c="dimmed">
                    No visible residents yet
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
                    View All Residents ({residentsData.visibleResidents})
                  </Button>
                </Group>
              )}
            </Card>
          </Grid.Col>

          {/* Residency Projects Showcase */}
          <Grid.Col span={12}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <IconBulb size={20} />
                  <Text fw={600}>Residency Projects</Text>
                </Group>
                <Badge variant="light">
                  {residentProjects?.length ?? 0} projects
                </Badge>
              </Group>

              {residentProjects && residentProjects.length > 0 ? (
                <Grid>
                  {residentProjects.slice(0, 6).map((project) => (
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
                    Be the first to showcase your work in the residency!
                  </Text>
                  <Button
                    component={Link}
                    href="/profile/edit"
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
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}