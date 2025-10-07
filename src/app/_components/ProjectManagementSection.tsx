"use client";

import { useState } from "react";
import { 
  Stack, 
  Text, 
  Button,
  Group,
  Paper,
  Badge,
  ActionIcon,
  Divider,
} from "@mantine/core";
import { 
  IconPlus, 
  IconExternalLink,
  IconBrandGithub,
  IconCalendar,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface ProjectData {
  id: string;
  title: string;
  description: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  submissionDate: Date | null;
}

interface ProjectManagementSectionProps {
  userId?: string;
}

export default function ProjectManagementSection({ userId }: ProjectManagementSectionProps) {
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Fetch user's projects
  const { data: userProjects, isLoading: projectsLoading } = api.project.getUserProjects.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  ) as { data: ProjectData[] | undefined; isLoading: boolean };

  if (!userId) {
    return (
      <Paper p="md" withBorder radius="sm" bg="gray.1">
        <Text size="sm" c="dimmed">
          No user associated with this application.
        </Text>
      </Paper>
    );
  }

  const handleCreateProject = () => {
    setIsCreatingProject(true);
    // TODO: Open modal or navigate to project creation
    console.log("Create project for user:", userId);
  };

  return (
    <Stack gap="md">
      <Divider 
        label={
          <Group gap="xs">
            <Text fw={600} size="sm" c="blue">
              Associated Projects
            </Text>
            <Badge size="xs" variant="light" color="blue">
              {userProjects?.length ?? 0}
            </Badge>
          </Group>
        } 
        labelPosition="left" 
      />

      {projectsLoading ? (
        <Paper p="md" withBorder radius="sm" bg="gray.0">
          <Text size="sm" c="dimmed">Loading projects...</Text>
        </Paper>
      ) : userProjects && userProjects.length > 0 ? (
        <Stack gap="sm">
          {userProjects.map((project) => (
            <Paper key={project.id} p="md" withBorder radius="sm" bg="blue.0">
              <Group justify="space-between" align="flex-start">
                <Stack gap="xs" flex={1}>
                  <Group gap="xs" align="center">
                    <Text fw={600} size="sm">
                      {project.title}
                    </Text>
                    {project.submissionDate && (
                      <Badge size="xs" color="green" variant="light">
                        Submitted
                      </Badge>
                    )}
                  </Group>
                  
                  {project.description && (
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {project.description}
                    </Text>
                  )}
                  
                  {project.submissionDate && (
                    <Group gap="xs">
                      <IconCalendar size={12} color="gray" />
                      <Text size="xs" c="dimmed">
                        Submitted: {new Date(project.submissionDate).toLocaleDateString()}
                      </Text>
                    </Group>
                  )}
                </Stack>
                
                <Group gap="xs">
                  {project.repoUrl && (
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="gray"
                      component="a"
                      href={project.repoUrl}
                      target="_blank"
                      title="View Repository"
                    >
                      <IconBrandGithub size={14} />
                    </ActionIcon>
                  )}
                  {project.demoUrl && (
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="blue"
                      component="a"
                      href={project.demoUrl}
                      target="_blank"
                      title="View Demo"
                    >
                      <IconExternalLink size={14} />
                    </ActionIcon>
                  )}
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Paper p="md" withBorder radius="sm" bg="gray.0">
          <Text size="sm" c="dimmed" ta="center">
            No projects found for this applicant.
          </Text>
        </Paper>
      )}

      <Group justify="center" mt="sm">
        <Button
          leftSection={<IconPlus size={16} />}
          variant="outline"
          color="blue"
          size="sm"
          onClick={handleCreateProject}
          loading={isCreatingProject}
        >
          Create Project
        </Button>
      </Group>
    </Stack>
  );
}