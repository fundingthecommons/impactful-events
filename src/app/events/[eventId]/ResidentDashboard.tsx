"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
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
  Modal,
  TextInput,
  Textarea,
  TagsInput,
  Switch,
  FileButton,
  Image,
  Box,
  Tooltip,
} from "@mantine/core";
import {
  IconUser,
  IconAlertCircle,
  IconCheck,
  IconStar,
  IconX,
  IconBulb,
  IconEdit,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import Link from "next/link";
import { AddProjectButton } from "~/app/_components/AddProjectButton";
import type { UserProject } from "@prisma/client";
import { AsksAndOffers } from "./AsksAndOffers";
import { CollaboratorsList } from "~/app/_components/CollaboratorsList";
import { UserSearchSelect } from "~/app/_components/UserSearchSelect";

const projectSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  githubUrl: z.string().url("Invalid GitHub URL").optional().or(z.literal("")),
  liveUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")), // Logo
  bannerUrl: z.string().optional().or(z.literal("")), // Banner
  technologies: z.array(z.string().max(30)).max(20),
  featured: z.boolean().optional().default(false),
});

type ProjectFormData = z.infer<typeof projectSchema>;

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
  const [modalOpened, setModalOpened] = useState(false);
  const [editingProject, setEditingProject] = useState<UserProject | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);

  // Fetch collaborators when editing a project
  const { data: projectCollaboratorsData, refetch: refetchCollaborators } =
    api.profile.getProjectCollaborators.useQuery(
      { projectId: editingProject?.id ?? "" },
      { enabled: !!editingProject }
    );

  // Collaborator mutations
  const addCollaborators = api.profile.addProjectCollaborators.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Success",
        message: `Added ${data.addedCount} collaborator${data.addedCount !== 1 ? 's' : ''}`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
      void refetchCollaborators();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to add collaborators",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const removeCollaborator = api.profile.removeProjectCollaborator.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Collaborator removed",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      void refetchCollaborators();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to remove collaborator",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  // Get profile completion data
  const { data: profileCompletion } = api.profile.getProfileCompletion.useQuery();

  // Get current user's projects - we'll need to refetch this when projects change
  const { data: userProfile, refetch: refetchUserProfile } = api.profile.getMyProfile.useQuery();

  const userProjects = userProfile?.projects ?? [];

  // Project mutations
  const createProject = api.profile.createProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Project created successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setModalOpened(false);
      form.reset();
      void refetchUserProfile();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to create project",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const updateProject = api.profile.updateProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Project updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setModalOpened(false);
      form.reset();
      setEditingProject(null);
      void refetchUserProfile();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to update project",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  // Form for project creation/editing
  const form = useForm<ProjectFormData>({
    validate: zodResolver(projectSchema),
    initialValues: {
      title: "",
      description: "",
      githubUrl: "",
      liveUrl: "",
      imageUrl: "",
      bannerUrl: "",
      technologies: [],
      featured: false,
    },
  });

  // Handler for form submission
  const handleSubmit = (values: ProjectFormData) => {
    // Clean up empty strings
    const cleanedValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        value === "" ? undefined : value,
      ])
    ) as ProjectFormData;

    if (editingProject) {
      updateProject.mutate({
        id: editingProject.id,
        ...cleanedValues,
      });
    } else {
      createProject.mutate(cleanedValues);
    }
  };

  // Handler for opening add project modal
  const handleAddProject = () => {
    setEditingProject(null);
    form.reset();
    setModalOpened(true);
  };

  // Handler for project logo upload
  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;

    setIsUploadingLogo(true);
    setLogoUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setLogoUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/upload/project-image', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setLogoUploadProgress(100);

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error ?? 'Upload failed');
      }

      const result = await response.json() as { imageUrl: string };

      // Update form with new logo URL
      form.setFieldValue('imageUrl', result.imageUrl);

      notifications.show({
        title: 'Success',
        message: 'Project logo uploaded successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

    } catch (error) {
      notifications.show({
        title: 'Upload failed',
        message: error instanceof Error ? error.message : 'Failed to upload logo',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setIsUploadingLogo(false);
      setLogoUploadProgress(0);
    }
  };

  // Handler for project banner upload
  const handleBannerUpload = async (file: File | null) => {
    if (!file) return;

    setIsUploadingBanner(true);
    setBannerUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setBannerUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/upload/project-image', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setBannerUploadProgress(100);

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error ?? 'Upload failed');
      }

      const result = await response.json() as { imageUrl: string };

      // Update form with new banner URL
      form.setFieldValue('bannerUrl', result.imageUrl);

      notifications.show({
        title: 'Success',
        message: 'Project banner uploaded successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

    } catch (error) {
      notifications.show({
        title: 'Upload failed',
        message: error instanceof Error ? error.message : 'Failed to upload banner',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setIsUploadingBanner(false);
      setBannerUploadProgress(0);
    }
  };

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
          {/* Profile Section - Show completion widget only if profile is under 70% */}
          {!profileCompletion?.meetsThreshold ? (
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                <Group justify="space-between" mb="md">
                  <Group gap="xs">
                    <IconUser size={20} />
                    <Text fw={600}>Profile Completion</Text>
                  </Group>
                  <Badge
                    color="orange"
                    variant="light"
                  >
                    {profileCompletion?.percentage ?? 0}%
                  </Badge>
                </Group>

                <Progress
                  value={profileCompletion?.percentage ?? 0}
                  color="orange"
                  size="lg"
                  mb="md"
                />

                <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
                  <Text size="sm">
                    <strong>Other residents will not be able to find you</strong> until you complete your profile 
                    (currently at {profileCompletion?.percentage ?? 0}%). Complete your profile to be visible 
                    in the participant directory.
                  </Text>
                </Alert>

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
                  variant="filled"
                  fullWidth
                >
                  Complete Profile
                </Button>
              </Card>
            </Grid.Col>
          ) : null}
          {/* <Stack align="center" gap="md">
                  <Group gap="xs">
                    <IconUser size={20} />
                    <Text fw={600}>Profile</Text>
                  </Group>
                  <Button
                    component={Link}
                    href={`/profile/edit?from-event=${eventId}`}
                    leftSection={<IconEdit size={16} />}
                    variant="light"
                  >
                    Edit Profile
                  </Button>
                </Stack> */}

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
                  <AddProjectButton onClick={handleAddProject}>
                    Add Your First Project
                  </AddProjectButton>
                </Stack>
              ) : (
                <Stack gap="md">
                  {userProjects.map((project) => (
                    <Paper
                      key={project.id}
                      p="sm"
                      withBorder
                      component={Link}
                      href={`/events/${eventId}/projects/${project.id}`}
                      style={{
                        textDecoration: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    >
                      <Group justify="space-between" align="flex-start" gap="md">
                        {project.imageUrl && (
                          <Image
                            src={project.imageUrl}
                            alt={project.title}
                            w={60}
                            h={60}
                            fit="cover"
                            radius="md"
                            style={{ flexShrink: 0 }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
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
                      </Group>
                    </Paper>
                  ))}

                  <AddProjectButton
                    onClick={handleAddProject}
                    size="xs"
                    iconSize={14}
                  >
                    Add Project
                  </AddProjectButton>
                </Stack>
              )}
            </Card>
          </Grid.Col>

          {/* Asks and Offers Widget */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <AsksAndOffers eventId={eventId} session={session} />
          </Grid.Col>
        </Grid>
      </Stack>

      {/* Project Creation/Editing Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingProject(null);
          form.reset();
        }}
        title={editingProject ? "Edit Project" : "Add Project"}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Project Title"
              placeholder="My Awesome Project"
              required
              {...form.getInputProps("title")}
            />

            <Textarea
              label="Description"
              placeholder="Brief description of your project"
              minRows={3}
              {...form.getInputProps("description")}
            />

            <Group grow>
              <TextInput
                label="GitHub URL"
                placeholder="https://github.com/user/repo"
                {...form.getInputProps("githubUrl")}
              />
              <TextInput
                label="Live Demo URL"
                placeholder="https://your-project.com"
                {...form.getInputProps("liveUrl")}
              />
            </Group>

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Project Logo
              </Text>
              <Text size="xs" c="dimmed">
                Upload a small logo or icon for your project (JPG, PNG, GIF, or WebP, max 5MB)
              </Text>

              {form.values.imageUrl && (
                <Box>
                  <Image
                    src={form.values.imageUrl}
                    alt="Project logo preview"
                    radius="md"
                    h={100}
                    w={100}
                    fit="contain"
                    style={{ border: '1px solid var(--mantine-color-gray-3)' }}
                  />
                </Box>
              )}

              <Group>
                <FileButton
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  disabled={isUploadingLogo}
                >
                  {(props) => (
                    <Button
                      {...props}
                      variant="light"
                      size="sm"
                      loading={isUploadingLogo}
                    >
                      {form.values.imageUrl ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                  )}
                </FileButton>
                {form.values.imageUrl && (
                  <Button
                    variant="subtle"
                    size="sm"
                    color="red"
                    onClick={() => form.setFieldValue('imageUrl', '')}
                  >
                    Remove Logo
                  </Button>
                )}
              </Group>

              {isUploadingLogo && (
                <Box>
                  <Text size="sm" mb="xs">Uploading logo...</Text>
                  <Progress value={logoUploadProgress} size="sm" />
                </Box>
              )}

              <TextInput
                placeholder="Or paste logo URL"
                {...form.getInputProps("imageUrl")}
                size="xs"
              />
            </Stack>

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Project Banner
              </Text>
              <Text size="xs" c="dimmed">
                Upload a large banner image for your project page (JPG, PNG, GIF, or WebP, max 5MB)
              </Text>

              {form.values.bannerUrl && (
                <Box>
                  <Image
                    src={form.values.bannerUrl}
                    alt="Project banner preview"
                    radius="md"
                    h={150}
                    fit="cover"
                    style={{ border: '1px solid var(--mantine-color-gray-3)' }}
                  />
                </Box>
              )}

              <Group>
                <FileButton
                  onChange={handleBannerUpload}
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  disabled={isUploadingBanner}
                >
                  {(props) => (
                    <Button
                      {...props}
                      variant="light"
                      size="sm"
                      loading={isUploadingBanner}
                    >
                      {form.values.bannerUrl ? 'Change Banner' : 'Upload Banner'}
                    </Button>
                  )}
                </FileButton>
                {form.values.bannerUrl && (
                  <Button
                    variant="subtle"
                    size="sm"
                    color="red"
                    onClick={() => form.setFieldValue('bannerUrl', '')}
                  >
                    Remove Banner
                  </Button>
                )}
              </Group>

              {isUploadingBanner && (
                <Box>
                  <Text size="sm" mb="xs">Uploading banner...</Text>
                  <Progress value={bannerUploadProgress} size="sm" />
                </Box>
              )}

              <TextInput
                placeholder="Or paste banner URL"
                {...form.getInputProps("bannerUrl")}
                size="xs"
              />
            </Stack>

            <TagsInput
              label="Technologies"
              placeholder="React, TypeScript, Node.js, etc."
              description="Technologies and tools used in this project"
              {...form.getInputProps("technologies")}
            />

            {/* Collaborators Section - only show when editing existing project */}
            {editingProject && projectCollaboratorsData && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Collaborators
                </Text>
                <Text size="xs" c="dimmed">
                  Add other platform users who can edit this project and post updates
                </Text>

                {/* List of current collaborators */}
                <CollaboratorsList
                  collaborators={projectCollaboratorsData.collaborators}
                  ownerId={projectCollaboratorsData.ownerId}
                  currentUserId={session?.user.id ?? ""}
                  isOwner={session?.user.id === projectCollaboratorsData.ownerId}
                  onRemove={(userId) =>
                    removeCollaborator.mutate({
                      projectId: editingProject.id,
                      userId,
                    })
                  }
                  loading={removeCollaborator.isPending}
                />

                {/* Search to add new collaborators - only show if current user is owner */}
                {session?.user.id === userProfile?.userId && userProfile && (
                  <UserSearchSelect
                    onSelect={(user) =>
                      addCollaborators.mutate({
                        projectId: editingProject.id,
                        userIds: [user.id],
                      })
                    }
                    excludeUserIds={[
                      userProfile.userId,
                      ...projectCollaboratorsData.collaborators.map((c) => c.user.id),
                    ]}
                    placeholder="Search users to add as collaborators..."
                  />
                )}
              </Stack>
            )}

            <Switch
              label="Featured Project"
              description="Show this project prominently on your profile"
              {...form.getInputProps("featured", { type: "checkbox" })}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="light"
                onClick={() => {
                  setModalOpened(false);
                  setEditingProject(null);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createProject.isPending || updateProject.isPending}
                leftSection={<IconCheck size={16} />}
              >
                {editingProject ? "Update Project" : "Add Project"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
