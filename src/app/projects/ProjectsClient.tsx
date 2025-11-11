"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Grid,
  Card,
  Avatar,
  Text,
  Badge,
  Button,
  TextInput,
  MultiSelect,
  Stack,
  Group,
  Loader,
  Center,
  ActionIcon,
  Tooltip,
  Image,
  Paper,
} from "@mantine/core";
import {
  IconSearch,
  IconBrandGithub,
  IconExternalLink,
  IconUser,
  IconPlus,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getDisplayName } from "~/utils/userDisplay";
import { getPrimaryRepoUrl } from "~/utils/project";

interface ProjectFilters {
  search: string;
  technologies: string[];
}

export function ProjectsClient() {
  const { data: session } = useSession();
  const [filters, setFilters] = useState<ProjectFilters>({
    search: "",
    technologies: [],
  });

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.profile.getAllFeaturedProjects.useInfiniteQuery(
    {
      search: filters.search || undefined,
      technologies: filters.technologies.length > 0 ? filters.technologies : undefined,
      limit: 20,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const allProjects = data?.pages.flatMap((page) => page.projects) ?? [];

  // Get unique technologies from all projects for filter options
  const allTechnologies = Array.from(
    new Set(
      allProjects
        .flatMap((project) => project.technologies)
    )
  ).map((tech) => ({ value: tech, label: tech }));

  const handleFilterChange = (key: keyof ProjectFilters, value: string | string[]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      technologies: [],
    });
  };

  const getProjectLinks = (project: typeof allProjects[0]) => {
    const links = [];
    
    if (project.liveUrl) {
      links.push(
        <Tooltip key="live" label="View Live Demo">
          <ActionIcon
            component="a"
            href={project.liveUrl}
            target="_blank"
            variant="light"
            size="sm"
            color="blue"
          >
            <IconExternalLink size={16} />
          </ActionIcon>
        </Tooltip>
      );
    }

    const primaryRepoUrl = getPrimaryRepoUrl(project);
    if (primaryRepoUrl) {
      links.push(
        <Tooltip key="github" label="View Source Code">
          <ActionIcon
            component="a"
            href={primaryRepoUrl}
            target="_blank"
            variant="light"
            size="sm"
            color="dark"
          >
            <IconBrandGithub size={16} />
          </ActionIcon>
        </Tooltip>
      );
    }

    return links;
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1} mb="xs">Projects Directory</Title>
          <Text c="dimmed">
            Discover featured projects from our community members
          </Text>
        </div>
        {session && (
          <Button component={Link} href="/profile/edit" leftSection={<IconPlus size={16} />}>
            Add Your Project
          </Button>
        )}
      </Group>

      <Grid gutter="xl">
        {/* Filters Sidebar */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Filters</Text>
              <Button variant="subtle" size="xs" onClick={clearFilters}>
                Clear all
              </Button>
            </Group>
            
            <Stack gap="md">
              <TextInput
                placeholder="Search projects..."
                leftSection={<IconSearch size={16} />}
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />

              <MultiSelect
                label="Technologies"
                placeholder="Select technologies"
                data={allTechnologies}
                value={filters.technologies}
                onChange={(value) => handleFilterChange("technologies", value)}
                searchable
                clearable
              />
            </Stack>
          </Card>
        </Grid.Col>

        {/* Projects Grid */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          {isLoading ? (
            <Center h={400}>
              <Loader size="lg" />
            </Center>
          ) : (
            <>
              <Text mb="md" c="dimmed">
                Showing {allProjects.length} featured projects
              </Text>
              
              <Grid>
                {allProjects.map((project) => (
                  <Grid.Col key={project.id} span={{ base: 12, sm: 6, lg: 4 }}>
                    <Card 
                      shadow="sm" 
                      padding="lg" 
                      radius="md" 
                      withBorder 
                      h="100%"
                    >
                      {/* Project Image */}
                      {project.imageUrl && (
                        <Card.Section>
                          <Image
                            src={project.imageUrl}
                            height={160}
                            alt={project.title}
                            fallbackSrc="https://placehold.co/400x160?text=Project"
                          />
                        </Card.Section>
                      )}

                      <Card.Section p="lg" pb="xs">
                        <Group justify="space-between" align="flex-start" mb="xs">
                          <Title order={4} lineClamp={2}>
                            {project.title}
                          </Title>
                          <Group gap="xs">
                            {getProjectLinks(project)}
                          </Group>
                        </Group>

                        {project.description && (
                          <Text size="sm" c="dimmed" lineClamp={3} mb="md">
                            {project.description}
                          </Text>
                        )}

                        {/* Technologies */}
                        {project.technologies.length > 0 && (
                          <Group gap="xs" mb="md">
                            {project.technologies.slice(0, 3).map((tech) => (
                              <Badge key={tech} variant="light" size="sm">
                                {tech}
                              </Badge>
                            ))}
                            {project.technologies.length > 3 && (
                              <Badge variant="outline" size="sm">
                                +{project.technologies.length - 3}
                              </Badge>
                            )}
                          </Group>
                        )}

                        {/* Creator Info */}
                        <Paper p="xs" radius="sm" bg="gray.0" withBorder>
                          <Group gap="xs">
                            <Avatar
                              src={project.profile.user.image}
                              size="sm"
                              radius="xl"
                            />
                            <div style={{ flex: 1 }}>
                              <Text size="sm" fw={500}>
                                {getDisplayName(project.profile.user, "Anonymous")}
                              </Text>
                            </div>
                            <Tooltip label="View Creator Profile">
                              <ActionIcon
                                component={Link}
                                href={`/profiles/${project.profile.user.id}`}
                                variant="light"
                                size="sm"
                                color="blue"
                              >
                                <IconUser size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Paper>
                      </Card.Section>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>

              {/* Load More Button */}
              {hasNextPage && (
                <Center mt="xl">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    loading={isFetchingNextPage}
                  >
                    Load More Projects
                  </Button>
                </Center>
              )}

              {allProjects.length === 0 && !isLoading && (
                <Paper p="xl" radius="md" withBorder>
                  <Center>
                    <Stack align="center" gap="md">
                      <Text size="lg" fw={500}>No projects found</Text>
                      <Text c="dimmed" ta="center">
                        No projects match your current filters. Try adjusting your search criteria.
                      </Text>
                      {session && (
                        <Button component={Link} href="/profile/edit" leftSection={<IconPlus size={16} />}>
                          Add the First Project
                        </Button>
                      )}
                    </Stack>
                  </Center>
                </Paper>
              )}
            </>
          )}
        </Grid.Col>
      </Grid>
    </Container>
  );
}