"use client";

import { useState } from "react";
import { 
  Container, 
  Title, 
  Card, 
  Text, 
  Badge, 
  Group, 
  Stack, 
  Button,
  TextInput,
  Select,
  Modal,
  Table,
  ActionIcon,
  Paper,
  Avatar,
  Loader,
  SimpleGrid,
  Tooltip,
  Menu
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { 
  IconSearch, 
  IconMail,
  IconUserPlus,
  IconEye,
  IconX
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";

interface AssignRoleForm {
  userId: string;
  eventId: string;
  roleId: string;
}

export default function UsersClient() {
  const [assignRoleModalOpen, setAssignRoleModalOpen] = useState(false);
  const [userDetailModalOpen, setUserDetailModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEventId, setFilterEventId] = useState<string>("");
  const [filterRoleId, setFilterRoleId] = useState<string>("");

  // API queries
  const { data: users, refetch: refetchUsers, isLoading: loadingUsers } = api.role.getAllUsersWithEventRoles.useQuery({
    search: searchTerm || undefined,
    eventId: filterEventId || undefined,
    roleId: filterRoleId || undefined,
  });

  const { data: userStats } = api.role.getUserStats.useQuery();
  const { data: events } = api.event.getEvents.useQuery();
  const { data: roles } = api.invitation.getAvailableRoles.useQuery();
  const { data: userDetails } = api.role.getUserDetails.useQuery(
    { userId: selectedUserId },
    { enabled: !!selectedUserId && userDetailModalOpen }
  );

  // API mutations
  const assignEventRole = api.role.assignEventRole.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Role assigned successfully",
        color: "green",
      });
      setAssignRoleModalOpen(false);
      assignRoleForm.reset();
      void refetchUsers();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const removeEventRole = api.role.removeEventRole.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Role removed successfully",
        color: "blue",
      });
      void refetchUsers();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const updateGlobalRole = api.role.updateUserGlobalRole.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "User role updated successfully",
        color: "green",
      });
      void refetchUsers();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  // Forms
  const assignRoleForm = useForm<AssignRoleForm>({
    initialValues: {
      userId: "",
      eventId: "",
      roleId: "",
    },
    validate: {
      userId: (value) => (value ? null : "User is required"),
      eventId: (value) => (value ? null : "Event is required"),
      roleId: (value) => (value ? null : "Role is required"),
    },
  });

  const handleAssignRole = (values: AssignRoleForm) => {
    assignEventRole.mutate(values);
  };

  const handleRemoveRole = (userId: string, eventId: string, roleId: string) => {
    removeEventRole.mutate({ userId, eventId, roleId });
  };

  const handleUpdateGlobalRole = (userId: string, newRole: "user" | "staff" | "admin") => {
    updateGlobalRole.mutate({ userId, newRole });
  };

  const openUserDetail = (userId: string) => {
    setSelectedUserId(userId);
    setUserDetailModalOpen(true);
  };

  const getGlobalRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "red";
      case "staff": return "orange";
      default: return "blue";
    }
  };

  if (loadingUsers) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="xl" />
        </Group>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1} mb="xs">User Management</Title>
          <Text c="dimmed">Manage users and assign event-specific roles</Text>
        </div>
        <Group>
          <Button 
            leftSection={<IconUserPlus size={16} />}
            onClick={() => setAssignRoleModalOpen(true)}
          >
            Assign Role
          </Button>
          <Link href="/admin/invitations" style={{ textDecoration: 'none' }}>
            <Button variant="light" leftSection={<IconMail size={16} />}>
              Send Invitations
            </Button>
          </Link>
        </Group>
      </Group>

      {/* Statistics */}
      {userStats && (
        <SimpleGrid cols={{ base: 2, sm: 5 }} mb="xl">
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700}>{userStats.total}</Text>
              <Text size="sm" c="dimmed">Total Users</Text>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700} c="red">{userStats.admins}</Text>
              <Text size="sm" c="dimmed">Admins</Text>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700} c="orange">{userStats.staff}</Text>
              <Text size="sm" c="dimmed">Staff</Text>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700} c="blue">{userStats.users}</Text>
              <Text size="sm" c="dimmed">Regular Users</Text>
            </Group>
          </Paper>
          <Paper p="md" radius="md" withBorder>
            <Group>
              <Text size="xl" fw={700} c="green">{userStats.usersWithEventRoles}</Text>
              <Text size="sm" c="dimmed">With Event Roles</Text>
            </Group>
          </Paper>
        </SimpleGrid>
      )}

      {/* Filters */}
      <Card withBorder mb="xl">
        <Group>
          <TextInput
            placeholder="Search users..."
            leftSection={<IconSearch size={16} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by event"
            value={filterEventId}
            onChange={(value) => setFilterEventId(value ?? "")}
            data={events?.map(event => ({ value: event.id, label: event.name })) ?? []}
            clearable
            style={{ minWidth: 200 }}
          />
          <Select
            placeholder="Filter by role"
            value={filterRoleId}
            onChange={(value) => setFilterRoleId(value ?? "")}
            data={roles?.map(role => ({ value: role.id, label: role.name })) ?? []}
            clearable
            style={{ minWidth: 150 }}
          />
        </Group>
      </Card>

      {/* Users Table */}
      <Card withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Global Role</Table.Th>
              <Table.Th>Event Roles</Table.Th>
              <Table.Th>Applications</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users?.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>
                  <Group>
                    <Avatar src={user.image} size="sm" radius="xl">
                      {user.name?.[0] ?? user.email?.[0]}
                    </Avatar>
                    <div>
                      <Text size="sm" fw={500}>{user.name ?? "No name"}</Text>
                      <Text size="xs" c="dimmed">{user.email}</Text>
                      {user.emailVerified && (
                        <Badge size="xs" color="green" variant="dot">Verified</Badge>
                      )}
                    </div>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Menu position="bottom-end">
                    <Menu.Target>
                      <Badge 
                        color={getGlobalRoleBadgeColor(user.role ?? "user")} 
                        variant="light" 
                        style={{ cursor: 'pointer' }}
                      >
                        {(user.role ?? "user").toUpperCase()}
                      </Badge>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Change Global Role</Menu.Label>
                      <Menu.Item 
                        onClick={() => handleUpdateGlobalRole(user.id, "user")}
                        disabled={user.role === "user"}
                      >
                        User
                      </Menu.Item>
                      <Menu.Item 
                        onClick={() => handleUpdateGlobalRole(user.id, "staff")}
                        disabled={user.role === "staff"}
                      >
                        Staff
                      </Menu.Item>
                      <Menu.Item 
                        onClick={() => handleUpdateGlobalRole(user.id, "admin")}
                        disabled={user.role === "admin"}
                      >
                        Admin
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {user.userRoles.length === 0 ? (
                      <Text size="xs" c="dimmed">No roles</Text>
                    ) : (
                      user.userRoles.slice(0, 2).map((userRole) => (
                        <Tooltip
                          key={`${userRole.event.id}-${userRole.role.id}`}
                          label={`${userRole.role.name} for ${userRole.event.name}`}
                        >
                          <Badge 
                            size="xs" 
                            variant="light" 
                            color="blue"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleRemoveRole(user.id, userRole.event.id, userRole.role.id)}
                          >
                            {userRole.role.name}
                          </Badge>
                        </Tooltip>
                      ))
                    )}
                    {user.userRoles.length > 2 && (
                      <Badge size="xs" variant="light" color="gray">
                        +{user.userRoles.length - 2}
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {user._count.applications} applications
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <ActionIcon
                      variant="light"
                      color="blue"
                      size="sm"
                      onClick={() => openUserDetail(user.id)}
                      title="View details"
                    >
                      <IconEye size={14} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="green"
                      size="sm"
                      onClick={() => {
                        assignRoleForm.setValues({ ...assignRoleForm.values, userId: user.id });
                        setAssignRoleModalOpen(true);
                      }}
                      title="Assign role"
                    >
                      <IconUserPlus size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {users?.length === 0 && (
          <Text ta="center" py="xl" c="dimmed">
            No users found matching your criteria.
          </Text>
        )}
      </Card>

      {/* Assign Role Modal */}
      <Modal
        opened={assignRoleModalOpen}
        onClose={() => setAssignRoleModalOpen(false)}
        title="Assign Event Role"
        size="md"
      >
        <form onSubmit={assignRoleForm.onSubmit(handleAssignRole)}>
          <Stack>
            <Select
              label="User"
              placeholder="Select a user"
              data={users?.map(user => ({ 
                value: user.id, 
                label: `${user.name ?? user.email} (${user.email})` 
              })) ?? []}
              {...assignRoleForm.getInputProps("userId")}
              required
              searchable
            />
            
            <Select
              label="Event"
              placeholder="Select an event"
              data={events?.map(event => ({ value: event.id, label: event.name })) ?? []}
              {...assignRoleForm.getInputProps("eventId")}
              required
            />
            
            <Select
              label="Role"
              placeholder="Select a role"
              data={roles?.map(role => ({ value: role.id, label: role.name })) ?? []}
              {...assignRoleForm.getInputProps("roleId")}
              required
            />
            
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setAssignRoleModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                loading={assignEventRole.isPending}
                leftSection={<IconUserPlus size={16} />}
              >
                Assign Role
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* User Detail Modal */}
      <Modal
        opened={userDetailModalOpen}
        onClose={() => setUserDetailModalOpen(false)}
        title="User Details"
        size="lg"
      >
        {userDetails ? (
          <Stack>
            {/* User Info */}
            <Group>
              <Avatar src={userDetails.image} size="lg" radius="xl">
                {userDetails.name?.[0] ?? userDetails.email?.[0]}
              </Avatar>
              <div>
                <Text fw={600} size="lg">{userDetails.name ?? "No name"}</Text>
                <Text c="dimmed">{userDetails.email}</Text>
                <Badge color={getGlobalRoleBadgeColor(userDetails.role ?? "user")} variant="light">
                  {(userDetails.role ?? "user").toUpperCase()}
                </Badge>
              </div>
            </Group>

            {/* Stats */}
            <SimpleGrid cols={3}>
              <Paper p="sm" withBorder>
                <Text size="lg" fw={700}>{userDetails._count.userRoles}</Text>
                <Text size="xs" c="dimmed">Event Roles</Text>
              </Paper>
              <Paper p="sm" withBorder>
                <Text size="lg" fw={700}>{userDetails._count.applications}</Text>
                <Text size="xs" c="dimmed">Applications</Text>
              </Paper>
              <Paper p="sm" withBorder>
                <Text size="lg" fw={700}>{userDetails._count.posts}</Text>
                <Text size="xs" c="dimmed">Posts</Text>
              </Paper>
            </SimpleGrid>

            {/* Event Roles */}
            <div>
              <Text fw={600} mb="sm">Event Roles</Text>
              {userDetails.userRoles.length === 0 ? (
                <Text size="sm" c="dimmed">No event roles assigned</Text>
              ) : (
                <Stack gap="xs">
                  {userDetails.userRoles.map((userRole) => (
                    <Group key={`${userRole.event.id}-${userRole.role.id}`} justify="space-between">
                      <Group>
                        <Badge color="blue" variant="light">{userRole.role.name}</Badge>
                        <Text size="sm">{userRole.event.name}</Text>
                        <Text size="xs" c="dimmed">
                          {new Date(userRole.event.startDate).toLocaleDateString()} - 
                          {new Date(userRole.event.endDate).toLocaleDateString()}
                        </Text>
                      </Group>
                      <ActionIcon
                        color="red"
                        variant="light"
                        size="sm"
                        onClick={() => handleRemoveRole(userDetails.id, userRole.event.id, userRole.role.id)}
                        title="Remove role"
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              )}
            </div>

            {/* Applications */}
            <div>
              <Text fw={600} mb="sm">Recent Applications</Text>
              {userDetails.applications.length === 0 ? (
                <Text size="sm" c="dimmed">No applications submitted</Text>
              ) : (
                <Stack gap="xs">
                  {userDetails.applications.slice(0, 5).map((application) => (
                    <Group key={application.id} justify="space-between">
                      <Group>
                        <Text size="sm">{application.event.name}</Text>
                        <Badge 
                          color={application.status === "ACCEPTED" ? "green" : application.status === "REJECTED" ? "red" : "blue"}
                          variant="light"
                          size="sm"
                        >
                          {application.status}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {new Date(application.createdAt).toLocaleDateString()}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              )}
            </div>
          </Stack>
        ) : (
          <Loader />
        )}
      </Modal>
    </Container>
  );
}
