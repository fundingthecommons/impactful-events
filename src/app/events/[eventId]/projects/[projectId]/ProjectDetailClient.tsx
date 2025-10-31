"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Stack,
  Button,
  Badge,
  Divider,
  Paper,
  Tabs,
  Timeline,
  Modal,
  TextInput,
  NumberInput,
  ActionIcon,
  Image,
  Anchor,
  FileButton,
  Progress,
  Box,
  SimpleGrid,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconBrandGithub,
  IconExternalLink,
  IconPlus,
  IconCalendarEvent,
  IconUser,
  IconMapPin,
  IconTrash,
  IconCheck,
  IconX,
  IconEdit,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import BlueskyConnectButton from "~/app/_components/BlueskyConnectButton";
import { MentionTextarea } from "~/app/_components/MentionTextarea";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import { LikeButton } from "~/app/_components/LikeButton";
import { GitCommitTimeline } from "~/app/_components/GitCommitTimeline";

interface ProjectDetailClientProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    githubUrl: string | null;
    liveUrl: string | null;
    imageUrl: string | null;
    bannerUrl: string | null;
    technologies: string[];
    featured: boolean;
    createdAt: Date;
    author: {
      id: string;
      name: string | null;
      image: string | null;
      profile?: {
        jobTitle: string | null;
        company: string | null;
        location: string | null;
        bio: string | null;
        githubUrl: string | null;
        linkedinUrl: string | null;
        twitterUrl: string | null;
        website: string | null;
      } | null;
    };
  };
  timeline: Array<{
    id: string;
    title: string;
    content: string;
    weekNumber: number | undefined;
    imageUrls: string[];
    githubUrls: string[];
    demoUrls: string[];
    tags: string[];
    createdAt: Date;
    author: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }>;
  eventId: string;
  isOwner: boolean;
  userId?: string;
}

export default function ProjectDetailClient({
  project,
  timeline: initialTimeline,
  eventId,
  isOwner,
  userId,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [updateToDelete, setUpdateToDelete] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const utils = api.useUtils();

  // Handle URL hash navigation on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove the '#'
    if (hash && (hash === "overview" || hash === "timeline")) {
      setActiveTab(hash);
    }
  }, []);

  // Update URL hash when tab changes
  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
      window.history.replaceState(null, "", `#${value}`);
    }
  };

  // Get fresh timeline data
  const { data: timeline = initialTimeline } = api.project.getProjectTimeline.useQuery({
    projectId: project.id,
  });

  // Create project update mutation
  const createUpdate = api.project.createProjectUpdate.useMutation({
    onSuccess: async () => {
      notifications.show({
        title: "Update posted!",
        message: "Your project update has been added to the timeline.",
        color: "green",
      });
      setUpdateModalOpen(false);
      form.reset();
      await utils.project.getProjectTimeline.invalidate({ projectId: project.id });
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  // Delete project update mutation
  const deleteUpdate = api.project.deleteProjectUpdate.useMutation({
    onSuccess: async () => {
      notifications.show({
        title: "Update deleted",
        message: "Your project update has been removed from the timeline.",
        color: "green",
      });
      setDeleteModalOpen(false);
      setUpdateToDelete(null);
      await utils.project.getProjectTimeline.invalidate({ projectId: project.id });
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  // Form for creating updates
  const form = useForm({
    initialValues: {
      title: "",
      content: "",
      weekNumber: undefined as number | undefined,
      imageUrls: [] as string[],
      githubUrls: [] as string[],
      demoUrls: [] as string[],
      tags: [] as string[],
    },
  });

  const handleCreateUpdate = async (values: typeof form.values) => {
    await createUpdate.mutateAsync({
      projectId: project.id,
      title: values.title,
      content: values.content,
      weekNumber: values.weekNumber,
      imageUrls: values.imageUrls.filter(url => url.trim() !== ""),
      githubUrls: values.githubUrls.filter(url => url.trim() !== ""),
      demoUrls: values.demoUrls.filter(url => url.trim() !== ""),
      tags: values.tags.filter(tag => tag.trim() !== ""),
    });
  };

  // Handler for project update image upload
  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    setIsUploadingImage(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/upload/project-image', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error ?? 'Upload failed');
      }

      const result = await response.json() as { imageUrl: string };

      // Add the uploaded image URL to the form's imageUrls array
      const currentUrls = form.values.imageUrls;
      form.setFieldValue('imageUrls', [...currentUrls, result.imageUrl]);

      notifications.show({
        title: 'Success',
        message: 'Image uploaded successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

    } catch (error) {
      notifications.show({
        title: 'Upload failed',
        message: error instanceof Error ? error.message : 'Failed to upload image',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteClick = (updateId: string) => {
    setUpdateToDelete(updateId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (updateToDelete) {
      await deleteUpdate.mutateAsync({ updateId: updateToDelete });
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <>
      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Back Navigation */}
          <Group>
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => router.back()}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Text size="sm" c="dimmed">
              Back to projects
            </Text>
          </Group>

          {/* Project Header */}
          <Card shadow="lg" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              {project.bannerUrl && (
                <div style={{ width: '100%', height: 300, borderRadius: 8, overflow: 'hidden' }}>
                  <Image
                    src={project.bannerUrl}
                    alt={project.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              )}
              
              <Group justify="space-between" align="flex-start">
                <Stack gap="sm" style={{ flex: 1 }}>
                  <Group gap="md">
                    <Title order={1}>{project.title}</Title>
                    {project.featured && (
                      <Badge variant="light" color="yellow" size="lg">
                        Featured
                      </Badge>
                    )}
                  </Group>
                  
                  {project.description && (
                    <Text size="lg" c="dimmed">
                      {project.description}
                    </Text>
                  )}
                </Stack>
              </Group>

              {/* Technologies */}
              {project.technologies.length > 0 && (
                <Group gap="xs">
                  {project.technologies.map((tech, index) => (
                    <Badge key={index} variant="outline" size="sm">
                      {tech}
                    </Badge>
                  ))}
                </Group>
              )}

              {/* Action buttons */}
              <Group gap="md">
                {isOwner && (
                  <Button
                    onClick={() => router.push(`/events/${eventId}`)}
                    leftSection={<IconEdit size={16} />}
                    variant="light"
                    color="blue"
                  >
                    Edit Project
                  </Button>
                )}
                {project.githubUrl && (
                  <Button
                    component="a"
                    href={project.githubUrl}
                    target="_blank"
                    leftSection={<IconBrandGithub size={16} />}
                    variant="light"
                  >
                    View Code
                  </Button>
                )}
                {project.liveUrl && (
                  <Button
                    component="a"
                    href={project.liveUrl}
                    target="_blank"
                    leftSection={<IconExternalLink size={16} />}
                    variant="filled"
                  >
                    Live Demo
                  </Button>
                )}
              </Group>
            </Stack>
          </Card>

          {/* Author Section */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group gap="md">
              {project.author.image && (
                <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden' }}>
                  <Image 
                    src={project.author.image} 
                    alt={project.author.name ?? "Author"} 
                    width={60} 
                    height={60} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                </div>
              )}
              <Stack gap="xs" style={{ flex: 1 }}>
                <Group gap="xs">
                  <IconUser size={16} />
                  <Text fw={500}>{project.author.name ?? 'Anonymous'}</Text>
                </Group>
                {project.author.profile?.jobTitle && (
                  <Text size="sm" c="dimmed">
                    {project.author.profile.jobTitle}
                    {project.author.profile.company && ` at ${project.author.profile.company}`}
                  </Text>
                )}
                {project.author.profile?.location && (
                  <Group gap="xs">
                    <IconMapPin size={14} />
                    <Text size="sm" c="dimmed">
                      {project.author.profile.location}
                    </Text>
                  </Group>
                )}
                {project.author.profile?.bio && (
                  <Text size="sm" lineClamp={2}>
                    {project.author.profile.bio}
                  </Text>
                )}
              </Stack>
            </Group>
          </Card>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="timeline">
                Timeline Updates
                {timeline.length > 0 && (
                  <Badge size="sm" variant="light" ml="xs">
                    {timeline.length}
                  </Badge>
                )}
              </Tabs.Tab>
              <Tabs.Tab value="devtimeline">Dev Timeline</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" mt="md">
              <Paper p="xl" radius="md" withBorder>
                <Stack gap="lg">
                  <Title order={2}>Project Details</Title>
                  
                  <Group gap="xl">
                    <Stack gap="xs">
                      <Text fw={500}>Created</Text>
                      <Text c="dimmed">{formatDate(project.createdAt)}</Text>
                    </Stack>
                    
                    <Stack gap="xs">
                      <Text fw={500}>Technologies</Text>
                      <Text c="dimmed">{project.technologies.length} technologies</Text>
                    </Stack>
                    
                    <Stack gap="xs">
                      <Text fw={500}>Updates</Text>
                      <Text c="dimmed">{timeline.length} timeline updates</Text>
                    </Stack>
                  </Group>

                  {project.description && (
                    <>
                      <Divider />
                      <Stack gap="md">
                        <Title order={3}>Description</Title>
                        <Text style={{ whiteSpace: 'pre-wrap' }}>
                          {project.description}
                        </Text>
                      </Stack>
                    </>
                  )}

                  {/* Author contact info */}
                  {(project.author.profile?.githubUrl ?? project.author.profile?.linkedinUrl ?? project.author.profile?.twitterUrl ?? project.author.profile?.website ?? isOwner) && (
                    <>
                      <Divider />
                      <Stack gap="md">
                        <Title order={3}>
                          {isOwner ? "Share Your Project" : "Contact Author"}
                        </Title>
                        
                        {/* Bluesky connect button - only for project owner */}
                        {isOwner && (
                          <BlueskyConnectButton 
                            projectTitle={project.title}
                            projectUrl={typeof window !== 'undefined' ? window.location.href : undefined}
                          />
                        )}
                        
                        {/* Author contact links */}
                        {(project.author.profile?.githubUrl ?? project.author.profile?.linkedinUrl ?? project.author.profile?.twitterUrl ?? project.author.profile?.website) && (
                          <Group gap="md">
                            {project.author.profile?.githubUrl && (
                              <Button 
                                component="a"
                                href={project.author.profile.githubUrl}
                                target="_blank"
                                variant="subtle"
                                size="sm"
                              >
                                GitHub
                              </Button>
                            )}
                            {project.author.profile?.linkedinUrl && (
                              <Button 
                                component="a"
                                href={project.author.profile.linkedinUrl}
                                target="_blank"
                                variant="subtle"
                                size="sm"
                              >
                                LinkedIn
                              </Button>
                            )}
                            {project.author.profile?.twitterUrl && (
                              <Button 
                                component="a"
                                href={project.author.profile.twitterUrl}
                                target="_blank"
                                variant="subtle"
                                size="sm"
                              >
                                Twitter
                              </Button>
                            )}
                            {project.author.profile?.website && (
                              <Button 
                                component="a"
                                href={project.author.profile.website}
                                target="_blank"
                                variant="subtle"
                                size="sm"
                              >
                                Website
                              </Button>
                            )}
                          </Group>
                        )}
                      </Stack>
                    </>
                  )}
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="timeline" mt="md">
              <Paper p="xl" radius="md" withBorder>
                <Stack gap="lg">
                  <Group justify="space-between">
                    <Title order={2}>Project Timeline</Title>
                    {isOwner && (
                      <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={() => setUpdateModalOpen(true)}
                      >
                        Add Update
                      </Button>
                    )}
                  </Group>

                  {timeline.length > 0 ? (
                    <Timeline active={timeline.length} bulletSize={24} lineWidth={2}>
                      {timeline.map((update) => (
                        <Timeline.Item
                          key={update.id}
                          bullet={<IconCalendarEvent size={12} />}
                          title={
                            <Group gap="xs" justify="space-between">
                              <Group gap="xs">
                                <Text fw={500}>{update.title}</Text>
                                {update.weekNumber && (
                                  <Badge size="xs" variant="outline">
                                    Week {update.weekNumber}
                                  </Badge>
                                )}
                              </Group>
                              {isOwner && (
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="sm"
                                  onClick={() => handleDeleteClick(update.id)}
                                  title="Delete update"
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              )}
                            </Group>
                          }
                        >
                          <Stack gap="sm" mt="xs">
                            <Group gap="xs">
                              <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden' }}>
                                {update.author.image ? (
                                  <Image 
                                    src={update.author.image} 
                                    alt={update.author.name ?? "Author"} 
                                    width={20} 
                                    height={20} 
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                  />
                                ) : (
                                  <div style={{ width: "100%", height: "100%", backgroundColor: "#e9ecef", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Text size="xs">?</Text>
                                  </div>
                                )}
                              </div>
                              <Text size="sm" c="dimmed">
                                {update.author.name ?? 'Anonymous'} • {getRelativeTime(update.createdAt)}
                              </Text>
                            </Group>
                            
                            <Box>
                              <MarkdownRenderer content={update.content} />
                            </Box>

                            {/* Images */}
                            {update.imageUrls.length > 0 && (
                              <Box mt="md">
                                {update.imageUrls.length === 1 ? (
                                  // Single image - display large
                                  <Paper
                                    radius="md"
                                    withBorder
                                    style={{
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      transition: 'transform 0.2s ease',
                                      ':hover': { transform: 'scale(1.02)' }
                                    }}
                                    onClick={() => handleImageClick(update.imageUrls[0]!)}
                                  >
                                    <Image
                                      src={update.imageUrls[0]}
                                      alt="Update image"
                                      style={{
                                        width: "100%",
                                        maxHeight: "400px",
                                        objectFit: "cover"
                                      }}
                                    />
                                  </Paper>
                                ) : (
                                  // Multiple images - display grid
                                  <SimpleGrid
                                    cols={{ base: 1, sm: 2, md: update.imageUrls.length >= 3 ? 3 : 2 }}
                                    spacing="md"
                                  >
                                    {update.imageUrls.map((url, imgIndex) => (
                                      <Paper
                                        key={imgIndex}
                                        radius="md"
                                        withBorder
                                        style={{
                                          overflow: 'hidden',
                                          cursor: 'pointer',
                                          transition: 'transform 0.2s ease',
                                          aspectRatio: '16/9'
                                        }}
                                        onClick={() => handleImageClick(url)}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'scale(1.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                        }}
                                      >
                                        <Image
                                          src={url}
                                          alt={`Update image ${imgIndex + 1}`}
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover"
                                          }}
                                        />
                                      </Paper>
                                    ))}
                                  </SimpleGrid>
                                )}
                              </Box>
                            )}

                            {/* Links */}
                            {(update.githubUrls.length > 0 || update.demoUrls.length > 0) && (
                              <Group gap="xs">
                                {update.githubUrls.map((url, urlIndex) => (
                                  <Anchor key={urlIndex} href={url} target="_blank" size="sm">
                                    <Group gap={4}>
                                      <IconBrandGithub size={14} />
                                      GitHub
                                    </Group>
                                  </Anchor>
                                ))}
                                {update.demoUrls.map((url, urlIndex) => (
                                  <Anchor key={urlIndex} href={url} target="_blank" size="sm">
                                    <Group gap={4}>
                                      <IconExternalLink size={14} />
                                      Demo
                                    </Group>
                                  </Anchor>
                                ))}
                              </Group>
                            )}

                            {/* Tags */}
                            {update.tags.length > 0 && (
                              <Group gap="xs">
                                {update.tags.map((tag, tagIndex) => (
                                  <Badge key={tagIndex} size="xs" variant="outline">
                                    {tag}
                                  </Badge>
                                ))}
                              </Group>
                            )}

                            {/* Like Button */}
                            <LikeButton
                              updateId={update.id}
                              initialLikeCount={0}
                              initialHasLiked={false}
                              userId={userId}
                            />
                          </Stack>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  ) : (
                    <Stack align="center" py="xl">
                      <Text c="dimmed" ta="center">
                        No updates yet. {isOwner ? "Add the first update to start documenting your progress!" : "Check back later for project updates."}
                      </Text>
                      {isOwner && (
                        <Button
                          variant="light"
                          leftSection={<IconPlus size={16} />}
                          onClick={() => setUpdateModalOpen(true)}
                        >
                          Add First Update
                        </Button>
                      )}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="devtimeline" mt="md">
              <Paper p="xl" radius="md" withBorder>
                <Stack gap="lg">
                  <Title order={2}>Development Timeline</Title>
                  <Text c="dimmed" size="sm">
                    Recent platform commits from the last 7 days
                  </Text>
                  <GitCommitTimeline />
                </Stack>
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Container>

      {/* Add Update Modal */}
      <Modal
        opened={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title="Add Project Update"
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleCreateUpdate)}>
          <Stack gap="md">
            <TextInput
              label="Update Title"
              placeholder="e.g., Implemented user authentication"
              required
              {...form.getInputProps('title')}
            />

            <MentionTextarea
              label="Description"
              placeholder="Describe what you've accomplished, challenges faced, next steps... (Use @ to mention users)"
              minRows={4}
              required
              value={form.values.content}
              onChange={(value) => form.setFieldValue('content', value)}
              error={typeof form.errors.content === 'string' ? form.errors.content : undefined}
            />

            <NumberInput
              label="Week Number (Optional)"
              placeholder="Which week of the program?"
              min={1}
              max={20}
              {...form.getInputProps('weekNumber')}
            />

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Update Images
              </Text>
              <Text size="xs" c="dimmed">
                Upload screenshots or demo images (JPG, PNG, GIF, or WebP, max 5MB each)
              </Text>

              {form.values.imageUrls.length > 0 && (
                <SimpleGrid cols={3} spacing="xs">
                  {form.values.imageUrls.map((url, index) => (
                    <Box key={index} pos="relative">
                      <Image
                        src={url}
                        alt={`Update image ${index + 1}`}
                        radius="md"
                        h={120}
                        fit="cover"
                        style={{ border: '1px solid var(--mantine-color-gray-3)' }}
                      />
                      <ActionIcon
                        color="red"
                        size="sm"
                        radius="xl"
                        variant="filled"
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                        }}
                        onClick={() => {
                          const newUrls = form.values.imageUrls.filter((_, i) => i !== index);
                          form.setFieldValue('imageUrls', newUrls);
                        }}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Box>
                  ))}
                </SimpleGrid>
              )}

              <Group>
                <FileButton
                  onChange={handleImageUpload}
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  disabled={isUploadingImage}
                >
                  {(props) => (
                    <Button
                      {...props}
                      variant="light"
                      size="sm"
                      leftSection={<IconPlus size={16} />}
                      loading={isUploadingImage}
                    >
                      Upload Image
                    </Button>
                  )}
                </FileButton>
              </Group>

              {isUploadingImage && (
                <Box>
                  <Text size="sm" mb="xs">Uploading...</Text>
                  <Progress value={uploadProgress} size="sm" />
                </Box>
              )}

              <TextInput
                placeholder="Or paste image URL and press Enter"
                size="xs"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const url = event.currentTarget.value.trim();
                    if (url) {
                      form.setFieldValue('imageUrls', [...form.values.imageUrls, url]);
                      event.currentTarget.value = '';
                    }
                  }
                }}
              />
            </Stack>

            <TextInput
              label="GitHub URLs (comma-separated)"
              placeholder="https://github.com/user/repo/commit/abc123, https://github.com/user/repo/pull/5"
              onChange={(event) => {
                const urls = event.target.value.split(',').map(url => url.trim());
                form.setFieldValue('githubUrls', urls);
              }}
            />

            <TextInput
              label="Demo URLs (comma-separated)"
              placeholder="https://myproject.vercel.app, https://demo.example.com"
              onChange={(event) => {
                const urls = event.target.value.split(',').map(url => url.trim());
                form.setFieldValue('demoUrls', urls);
              }}
            />

            <TextInput
              label="Tags (comma-separated)"
              placeholder="milestone, frontend, demo, challenge"
              onChange={(event) => {
                const tags = event.target.value.split(',').map(tag => tag.trim());
                form.setFieldValue('tags', tags);
              }}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setUpdateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createUpdate.isPending}>
                Post Update
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Update"
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete this update? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDelete}
              loading={deleteUpdate.isPending}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Image Modal */}
      <Modal
        opened={imageModalOpen}
        onClose={() => {
          setImageModalOpen(false);
          setSelectedImage(null);
        }}
        size="xl"
        padding={0}
        withCloseButton={true}
        centered
      >
        {selectedImage && (
          <Image
            src={selectedImage}
            alt="Full size image"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "90vh",
              objectFit: "contain"
            }}
          />
        )}
      </Modal>
    </>
  );
}