import { Group, Title, Text, Progress, TextInput, ActionIcon, Tooltip, Avatar, Paper } from "@mantine/core";
import { IconSearch, IconMail, IconBell } from "@tabler/icons-react";
import Image from "next/image";
import { auth } from "~/server/auth";
import Link from "next/link";

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
        <Group align="center" gap={8}>
          <Link href="/events">Events</Link>
        </Group>
        <Group gap={16}>
          <TextInput
            placeholder="Search"
            leftSection={<IconSearch size={16} />}
            size="sm"
            w={180}
          />
          <Tooltip label="Inbox" withArrow>
            <ActionIcon variant="default" size="lg" radius="md">
              <IconMail size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Notifications" withArrow>
            <ActionIcon variant="default" size="lg" radius="md">
              <IconBell size={18} />
            </ActionIcon>
          </Tooltip>
          <Avatar src={session?.user?.image ?? ""} radius="xl" size={36} />
          
        </Group>
      </Group>
    </Paper>
  );
} 