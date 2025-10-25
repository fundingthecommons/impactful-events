"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
import {
  Stack,
  Group,
  Text,
  Button,
  Modal,
  TextInput,
  Textarea,
  TagsInput,
  Switch,
  Card,
  Badge,
  ActionIcon,
  Box,
  SimpleGrid,
  Paper,
  Title,
} from "@mantine/core";
import {
  IconEdit,
  IconTrash,
  IconBrandGithub,
  IconExternalLink,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import type { UserProject } from "@prisma/client";
import { AddProjectButton } from "./AddProjectButton";

const projectSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  githubUrl: z.string().url("Invalid GitHub URL").optional().or(z.literal("")),
  liveUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
  technologies: z.array(z.string().max(30)).max(20),
  featured: z.boolean().optional().default(false),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectManagerProps {
  projects: UserProject[];
  onProjectsChange?: () => void;
}

export function ProjectManager({ projects, onProjectsChange }: ProjectManagerProps) {
  const [opened, setOpened] = useState(false);
  const [editingProject, setEditingProject] = useState<UserProject | null>(null);

  const createProject = api.profile.createProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Project created successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setOpened(false);
      form.reset();
      onProjectsChange?.();
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
      setOpened(false);
      form.reset();
      setEditingProject(null);
      onProjectsChange?.();
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

  const deleteProject = api.profile.deleteProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Project deleted successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      onProjectsChange?.();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to delete project",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const form = useForm<ProjectFormData>({
    validate: zodResolver(projectSchema),
    initialValues: {
      title: "",
      description: "",
      githubUrl: "",
      liveUrl: "",
      imageUrl: "",
      technologies: [],
      featured: false,
    },
  });

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

  const handleEdit = (project: UserProject) => {
    setEditingProject(project);
    form.setValues({
      title: project.title,
      description: project.description ?? "",
      githubUrl: project.githubUrl ?? "",
      liveUrl: project.liveUrl ?? "",
      imageUrl: project.imageUrl ?? "",
      technologies: project.technologies,
      featured: project.featured,
    });
    setOpened(true);
  };

  const handleDelete = (projectId: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject.mutate({ id: projectId });
    }
  };

  const handleAddNew = () => {
    setEditingProject(null);
    form.reset();
    setOpened(true);
  };

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={2} size="h3">
            Projects Showcase
          </Title>
          <AddProjectButton onClick={handleAddNew}>
            Add Project
          </AddProjectButton>
        </Group>

        {projects.length === 0 ? (
          <Box ta="center" py="xl">
            <Text c="dimmed">No projects added yet</Text>
            <Text size="sm" c="dimmed" mt="xs">
              Showcase your work by adding your projects
            </Text>
          </Box>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 1 }} spacing="md">
            {projects
              .sort((a, b) => {
                if (a.featured && !b.featured) return -1;
                if (!a.featured && b.featured) return 1;
                return a.order - b.order;
              })
              .map((project) => (
                <Paper key={project.id} p="md" withBorder radius="md">
                  <Group justify="space-between" align="flex-start" mb="sm">
                    <div style={{ flex: 1 }}>
                      <Group gap="xs" mb="xs">
                        <Text fw={500} size="lg">{project.title}</Text>
                        {project.featured && (
                          <Badge size="xs" color="yellow">Featured</Badge>
                        )}
                      </Group>
                      {project.description && (
                        <Text size="sm" c="dimmed" mb="sm">
                          {project.description}
                        </Text>
                      )}
                    </div>
                    
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        onClick={() => handleEdit(project)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(project.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                  
                  <Group justify="space-between" align="flex-end">
                    <Group gap={4}>
                      {project.technologies.map((tech) => (
                        <Badge key={tech} size="xs" variant="dot">
                          {tech}
                        </Badge>
                      ))}
                    </Group>
                    
                    <Group gap="xs">
                      {project.githubUrl && (
                        <ActionIcon
                          component="a"
                          href={project.githubUrl}
                          target="_blank"
                          variant="light"
                          size="sm"
                        >
                          <IconBrandGithub size={16} />
                        </ActionIcon>
                      )}
                      {project.liveUrl && (
                        <ActionIcon
                          component="a"
                          href={project.liveUrl}
                          target="_blank"
                          variant="light"
                          size="sm"
                        >
                          <IconExternalLink size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Group>
                </Paper>
              ))}
          </SimpleGrid>
        )}
      </Card>

      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
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

            <TextInput
              label="Image URL"
              placeholder="https://example.com/screenshot.png"
              description="Optional screenshot or logo for your project"
              {...form.getInputProps("imageUrl")}
            />

            <TagsInput
              label="Technologies"
              placeholder="React, TypeScript, Node.js, etc."
              description="Technologies and tools used in this project"
              {...form.getInputProps("technologies")}
            />

            <Switch
              label="Featured Project"
              description="Show this project prominently on your profile"
              {...form.getInputProps("featured", { type: "checkbox" })}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="light"
                onClick={() => {
                  setOpened(false);
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
    </>
  );
}
