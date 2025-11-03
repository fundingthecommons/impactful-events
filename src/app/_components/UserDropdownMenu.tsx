"use client";

import { 
  Menu, 
  Avatar, 
  Text, 
  Group, 
  Stack,
  Badge,
  Divider,
  rem 
} from "@mantine/core";
import {
  IconUser,
  IconEdit,
  IconLogout,
  IconShield,
  IconSettings,
} from "@tabler/icons-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import type { Session } from "next-auth";
import { api } from "~/trpc/react";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { getDisplayName } from "~/utils/userDisplay";

interface UserDropdownMenuProps {
  session: Session;
}

export function UserDropdownMenu({ session }: UserDropdownMenuProps) {
  // Fetch user profile to get custom avatar
  const { data: profile } = api.profile.getMyProfile.useQuery();

  const handleSignOut = () => {
    void signOut();
  };

  // Determine avatar URL with priority logic
  const avatarUrl = getAvatarUrl({
    customAvatarUrl: profile?.avatarUrl,
    oauthImageUrl: session.user.image,
    name: session.user.name,
    email: session.user.email,
  });

  const avatarInitials = getAvatarInitials({
    name: session.user.name,
    email: session.user.email,
  });

  return (
    <Menu shadow="md" width={220} position="bottom-end">
      <Menu.Target>
        <Group gap="xs" style={{ cursor: "pointer" }}>
          <Stack gap={0} align="flex-end">
            <Group gap="xs">
              <Text size="sm" fw={500}>
                {getDisplayName(session.user)}
              </Text>
              <Avatar src={avatarUrl} radius="xl" size={32}>
                {avatarInitials}
              </Avatar>
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
        </Group>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Profile</Menu.Label>
        
        <Menu.Item 
          leftSection={<IconUser style={{ width: rem(14), height: rem(14) }} />}
          component={Link}
          href={`/profiles/${session.user.id}`}
        >
          View Profile
        </Menu.Item>
        
        <Menu.Item 
          leftSection={<IconEdit style={{ width: rem(14), height: rem(14) }} />}
          component={Link}
          href="/profile/edit"
        >
          Edit Profile
        </Menu.Item>

        {/* <Divider />

        <Menu.Label>Community</Menu.Label> */}
        
        {/* <Menu.Item 
          leftSection={<IconUsers style={{ width: rem(14), height: rem(14) }} />}
          component={Link}
          href="/profiles"
        >
          Member Directory
        </Menu.Item> */}

        {/* Admin items */}
        {(session.user.role === "admin" || session.user.role === "staff") && (
          <>
            <Divider />
            <Menu.Label>Administration</Menu.Label>
            
            <Menu.Item 
              leftSection={<IconSettings style={{ width: rem(14), height: rem(14) }} />}
              component={Link}
              href="/admin"
            >
              Admin Dashboard
            </Menu.Item>
          </>
        )}

        <Divider />

        <Menu.Item 
          color="red"
          leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
          onClick={handleSignOut}
        >
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}