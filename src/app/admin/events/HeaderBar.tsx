import { Group, Text, Avatar, Paper, Stack, Badge } from "@mantine/core";
import { IconShield } from "@tabler/icons-react";
import Image from "next/image";
import { auth } from "~/server/auth";
import Link from "next/link";
import SignOutButton from "./SignOutButton";

export default async function HeaderBar() {
    const session = await auth();
  return (
    <Paper bg="white" withBorder radius={0} p="md" style={{ paddingLeft: 32, paddingRight: 32, boxShadow: '0 1px 4px 0 rgba(0,0,0,0.03)' }}>
      <Group justify="space-between" align="center">
        <Group align="center" gap={8}>
        <Image src="/images/ftc-logo.avif" alt="FtC" width={100} height={100} />
        
          {/* <Text size="sm" c="dimmed">37</Text>
          <Progress value={61} w={120} color="blue" size="sm" style={{ marginLeft: 16, marginRight: 8 }} />
          <Text size="sm" c="dimmed">61% complete</Text> */}
        </Group>
        <Group align="center" gap={16}>
          <Link href="/events" style={{ textDecoration: 'none', fontWeight: 500 }}>Events</Link>
          <Link href="/contacts" style={{ textDecoration: 'none', fontWeight: 500 }}>Contacts</Link>
          <Link href="/crypto-nomads-import" style={{ textDecoration: 'none', fontWeight: 500 }}>Import</Link>
        </Group>
        <Group gap={16}>
          {session?.user && (
            <Stack gap={0} align="flex-end">
              <Group gap="xs">
                <Text size="sm" fw={500}>
                  {session.user.name ?? session.user.email}
                </Text>
                <Avatar src={session.user.image ?? ""} radius="xl" size={32} />
              </Group>
              {session.user.role && session.user.role !== "user" && (
                <Group gap={4}>
                  <IconShield size={12} color="green" />
                  <Badge size="xs" color={session.user.role === "admin" ? "red" : "green"} variant="light">
                    {session.user.role.toUpperCase()}
                  </Badge>
                </Group>
              )}
            </Stack>
          )}
          {session && <SignOutButton />}
        </Group>
      </Group>
    </Paper>
  );
} 