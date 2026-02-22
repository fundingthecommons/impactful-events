'use client';

import { useRef, useEffect } from 'react';
import {
  Drawer,
  Stack,
  Group,
  Text,
  Textarea,
  ActionIcon,
  Paper,
  Box,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconSend,
  IconPlayerStop,
  IconTrash,
} from '@tabler/icons-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useAIChat } from '~/hooks/useAIChat';

interface AIChatDrawerProps {
  opened: boolean;
  onClose: () => void;
  pathname: string;
  eventId?: string;
}

const SUGGESTED_PROMPTS = [
  'What events are coming up?',
  'How do I apply to speak?',
  "Show me today's schedule",
];

export function AIChatDrawer({ opened, onClose, pathname, eventId }: AIChatDrawerProps) {
  const { messages, isStreaming, sendMessage, stop, clearMessages } = useAIChat({
    pathname,
    eventId,
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const value = inputRef.current?.value.trim();
    if (!value || isStreaming) return;
    void sendMessage(value);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Group gap="xs">
          <Text fw={600} size="lg">AI Assistant</Text>
        </Group>
      }
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 60px)',
          padding: 0,
        },
        header: {
          borderBottom: '1px solid var(--mantine-color-default-border)',
        },
      }}
    >
      {/* Clear button in header area */}
      {messages.length > 0 && (
        <Box px="md" pb="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <Tooltip label="Clear conversation">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={clearMessages}
              disabled={isStreaming}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Box>
      )}

      {/* Messages area */}
      <Box
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--mantine-spacing-md)',
        }}
      >
        {messages.length === 0 ? (
          /* Welcome state */
          <Stack gap="md" mt="xl" align="center">
            <Text size="lg" fw={500} c="dimmed" ta="center">
              How can I help you?
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={300}>
              Ask me about events, schedules, how to use the platform, or anything else.
            </Text>
            <Stack gap="xs" mt="md" w="100%" maw={320}>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <UnstyledButton
                  key={prompt}
                  onClick={() => void sendMessage(prompt)}
                  style={{
                    padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
                    borderRadius: 'var(--mantine-radius-md)',
                    border: '1px solid var(--mantine-color-default-border)',
                    transition: 'background-color 150ms ease',
                  }}
                  styles={{
                    root: {
                      '&:hover': {
                        backgroundColor: 'var(--mantine-color-gray-0)',
                      },
                    },
                  }}
                >
                  <Text size="sm">{prompt}</Text>
                </UnstyledButton>
              ))}
            </Stack>
          </Stack>
        ) : (
          /* Message list */
          <Stack gap="md">
            {messages.map((message) => (
              <Box
                key={message.id}
                style={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Paper
                  p="sm"
                  radius="lg"
                  style={{
                    background:
                      message.role === 'user'
                        ? 'var(--theme-chat-user-bg, var(--mantine-color-blue-6))'
                        : 'var(--theme-chat-assistant-bg, var(--mantine-color-gray-0))',
                    color: message.role === 'user' ? 'white' : undefined,
                  }}
                >
                  {message.role === 'assistant' ? (
                    message.content ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <Text size="sm" c="dimmed" fs="italic">
                        Thinking...
                      </Text>
                    )
                  ) : (
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Text>
                  )}
                </Paper>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {/* Input area */}
      <Box
        p="md"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          background: 'var(--theme-chat-input-bg, var(--mantine-color-body))',
        }}
      >
        <Group gap="xs" align="flex-end">
          <Textarea
            ref={inputRef}
            placeholder="Ask anything about the platform..."
            autosize
            minRows={1}
            maxRows={4}
            style={{ flex: 1 }}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <Tooltip label="Stop">
              <ActionIcon
                variant="filled"
                color="red"
                size="lg"
                radius="xl"
                onClick={stop}
              >
                <IconPlayerStop size={18} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Tooltip label="Send">
              <ActionIcon
                variant="filled"
                color="blue"
                size="lg"
                radius="xl"
                onClick={handleSend}
              >
                <IconSend size={18} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Box>
    </Drawer>
  );
}
