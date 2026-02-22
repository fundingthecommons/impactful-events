'use client';

import { useState } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconMessageChatbot } from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { AIChatDrawer } from './AIChatDrawer';

export function AIChatFAB() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [opened, setOpened] = useState(false);

  // Only show for authenticated users
  if (!session?.user) return null;

  // Extract eventId from pathname: /events/{eventId}/...
  const eventIdMatch = /\/events\/([^/]+)/.exec(pathname);
  const eventId = eventIdMatch?.[1];

  return (
    <>
      <Tooltip label="AI Assistant" position="left" offset={16}>
        <ActionIcon
          onClick={() => setOpened(true)}
          size="xl"
          radius="xl"
          variant="filled"
          color="violet"
          style={{
            position: 'fixed',
            bottom: '7rem',
            right: '2rem',
            zIndex: 1000,
            transition: 'all 200ms ease',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
          aria-label="Open AI Assistant"
        >
          <IconMessageChatbot size={24} stroke={1.5} />
        </ActionIcon>
      </Tooltip>
      <AIChatDrawer
        opened={opened}
        onClose={() => setOpened(false)}
        pathname={pathname}
        eventId={eventId}
      />
    </>
  );
}
