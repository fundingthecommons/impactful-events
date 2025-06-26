"use client";
import { Group, Title, Text, Progress, TextInput, ActionIcon, Tooltip, Avatar, Paper } from "@mantine/core";
import { IconSearch, IconMail, IconBell } from "@tabler/icons-react";

export default function HeaderBar() {
  return (
    <Paper bg="white" withBorder radius={0} p="md" style={{ paddingLeft: 32, paddingRight: 32, boxShadow: '0 1px 4px 0 rgba(0,0,0,0.03)' }}>
      <Group justify="space-between" align="center">
        <Group align="center" gap={8}>
          <Title order={3} style={{ marginRight: 8 }}>Hackathon Sponsor onboarding</Title>
          {/* <Text size="sm" c="dimmed">37</Text>
          <Progress value={61} w={120} color="blue" size="sm" style={{ marginLeft: 16, marginRight: 8 }} />
          <Text size="sm" c="dimmed">61% complete</Text> */}
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
          <Avatar src="https://randomuser.me/api/portraits/men/32.jpg" radius="xl" size={36} />
        </Group>
      </Group>
    </Paper>
  );
} 