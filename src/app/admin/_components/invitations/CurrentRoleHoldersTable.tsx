import { Card, Title, Table, Text, Badge } from "@mantine/core";

interface RoleHolder {
  id: string;
  name: string | null;
  email: string | null;
}

interface CurrentRoleHoldersTableProps {
  holders: RoleHolder[];
  roleName: string;
  badgeColor?: string;
  title?: string;
}

export default function CurrentRoleHoldersTable({
  holders,
  roleName,
  badgeColor = "blue",
  title,
}: CurrentRoleHoldersTableProps) {
  if (holders.length === 0) return null;

  return (
    <Card withBorder mb="md">
      <Title order={3} mb="md">
        {title ?? `Current ${capitalize(roleName)}s`}
      </Title>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Role</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {holders.map((holder) => (
            <Table.Tr key={holder.id}>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {holder.name ?? "Unknown"}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{holder.email}</Text>
              </Table.Td>
              <Table.Td>
                <Badge variant="light" color={badgeColor} size="sm">
                  {roleName}
                </Badge>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Card>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
