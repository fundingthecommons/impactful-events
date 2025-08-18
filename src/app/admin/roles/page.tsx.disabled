"use client";

// Disable static generation for this admin page
export const dynamic = 'force-dynamic';\nexport const revalidate = 0;

import { useState } from "react";
import {
  Container,
  Title,
  Paper,
  Stack,
  Table,
  Group,
  Text,
  Badge,
  Button,
  Modal,
  Select,
  Alert,
  LoadingOverlay,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconPlus, IconTrash, IconShield, IconUser } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { hasAdminAccess } from "~/lib/permissions";

export default function RoleAdminPage() {
  const { data: session, status } = useSession();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  // Check admin access
  const hasAdmin = hasAdminAccess(session);
  
  // Don't render during loading state
  if (status === "loading") {
    return (
      <Container size="sm" py="xl">
        <Text>Loading...</Text>
      </Container>
    );
  }

  // Queries - only run if we have session data
  const { data: usersWithRoles, isLoading: usersLoading, refetch: refetchUsers } = 
    api.role.getUsersWithRoles.useQuery(undefined, {
      enabled: hasAdmin && status === "authenticated",
    });

  const { data: globalRoles, isLoading: rolesLoading } = 
    api.role.getGlobalRoles.useQuery(undefined, {
      enabled: status === "authenticated",
    });

  // Mutations
  const assignRoleMutation = api.role.assignGlobalRole.useMutation({
    onSuccess: () => {
      void refetchUsers();
      setAssignModalOpen(false);
      setSelectedUserId("");
      setSelectedRoleId("");
    },
  });

  const removeRoleMutation = api.role.removeGlobalRole.useMutation({
    onSuccess: () => {
      void refetchUsers();
    },
  });

  const createRoleMutation = api.role.createGlobalRole.useMutation({
    onSuccess: () => {
      void refetchUsers();
    },
  });

  const handleAssignRole = () => {
    if (selectedUserId && selectedRoleId) {
      assignRoleMutation.mutate({
        userId: selectedUserId,
        globalRoleId: selectedRoleId,
      });
    }
  };

  const handleRemoveRole = (userId: string, roleId: string) => {
    removeRoleMutation.mutate({
      userId,
      globalRoleId: roleId,
    });
  };

  // Create initial FTC_STAFF role if it doesn't exist
  const handleCreateStaffRole = () => {
    createRoleMutation.mutate({
      name: "FTC_STAFF",
      description: "Funding the Commons staff members",
      permissions: [
        "events:read",
        "events:write",
        "contacts:read", 
        "contacts:write",
        "imports:read",
        "imports:write"
      ],
    });
  };

  if (!hasAdmin) {
    return (
      <Container size="sm" py="xl">
        <Alert color="red" title="Access Denied">
          You don&apos;t have permission to access the role administration interface.
        </Alert>
      </Container>
    );
  }

  const ftcStaffRole = globalRoles?.find(role => role.name === "FTC_STAFF");

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={1}>Role Administration</Title>
          <Group>
            {!ftcStaffRole && (
              <Button
                leftSection={<IconShield size={16} />}
                onClick={handleCreateStaffRole}
                loading={createRoleMutation.isPending}
                color="green"
              >
                Create FTC Staff Role
              </Button>
            )}
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setAssignModalOpen(true)}
            >
              Assign Role
            </Button>
          </Group>
        </Group>

        {/* Role Statistics */}
        <Paper p="md" withBorder>
          <Group>
            <Stack gap={0} align="center">
              <Text size="xl" fw={700} c="blue">
                {globalRoles?.length ?? 0}
              </Text>
              <Text size="sm" c="dimmed">Global Roles</Text>
            </Stack>
            <Stack gap={0} align="center">
              <Text size="xl" fw={700} c="green">
                {usersWithRoles?.filter(u => u.globalRoles.length > 0).length ?? 0}
              </Text>
              <Text size="sm" c="dimmed">Users with Roles</Text>
            </Stack>
            <Stack gap={0} align="center">
              <Text size="xl" fw={700} c="orange">
                {ftcStaffRole?.userGlobalRoles?.length ?? 0}
              </Text>
              <Text size="sm" c="dimmed">FTC Staff Members</Text>
            </Stack>
          </Group>
        </Paper>

        {/* Users with Roles Table */}
        <Paper shadow="sm" p="lg" withBorder pos="relative">
          <LoadingOverlay visible={usersLoading || rolesLoading} />
          
          <Stack gap="md">
            <Title order={3}>Users and Their Roles</Title>
            
            {usersWithRoles && usersWithRoles.length > 0 ? (
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>User</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Roles</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {usersWithRoles.map((user) => (
                    <Table.Tr key={user.id}>
                      <Table.Td>
                        <Group gap="sm">
                          <IconUser size={16} />
                          <Text fw={500}>{user.name ?? "Unnamed User"}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">{user.email}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {user.globalRoles.length > 0 ? (
                            user.globalRoles.map((role) => (
                              <Badge
                                key={role.id}
                                color={role.name === "FTC_STAFF" ? "green" : "blue"}
                                variant="light"
                              >
                                {role.name}
                              </Badge>
                            ))
                          ) : (
                            <Text size="sm" c="dimmed">No roles</Text>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {user.globalRoles.map((role) => (
                            <Tooltip key={role.id} label={`Remove ${role.name} role`}>
                              <ActionIcon
                                size="sm"
                                color="red"
                                variant="subtle"
                                onClick={() => handleRemoveRole(user.id, role.id)}
                                loading={removeRoleMutation.isPending}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Tooltip>
                          ))}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text ta="center" c="dimmed" py="xl">
                No users found.
              </Text>
            )}
          </Stack>
        </Paper>

        {/* Assign Role Modal */}
        <Modal
          opened={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Assign Role to User"
        >
          <Stack gap="md">
            <Select
              label="Select User"
              placeholder="Choose a user"
              value={selectedUserId}
              onChange={(value) => setSelectedUserId(value ?? "")}
              data={
                usersWithRoles?.map((user) => ({
                  value: user.id,
                  label: `${user.name ?? "Unnamed"} (${user.email})`,
                })) ?? []
              }
              searchable
            />

            <Select
              label="Select Role"
              placeholder="Choose a role"
              value={selectedRoleId}
              onChange={(value) => setSelectedRoleId(value ?? "")}
              data={
                globalRoles?.map((role) => ({
                  value: role.id,
                  label: `${role.name} - ${role.description ?? "No description"}`,
                })) ?? []
              }
            />

            {assignRoleMutation.error && (
              <Alert color="red">
                {assignRoleMutation.error.message}
              </Alert>
            )}

            <Group justify="flex-end">
              <Button 
                variant="outline" 
                onClick={() => setAssignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignRole}
                loading={assignRoleMutation.isPending}
                disabled={!selectedUserId || !selectedRoleId}
              >
                Assign Role
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}