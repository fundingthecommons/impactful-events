"use client";

import { Modal, Stack, Text, Group, ThemeIcon } from "@mantine/core";
import { IconX, IconUserPlus } from "@tabler/icons-react";
import AuthForm from "./AuthForm";

interface AuthModalProps {
  opened: boolean;
  onClose: () => void;
  callbackUrl?: string;
  title?: string;
  subtitle?: string;
}

export default function AuthModal({ 
  opened, 
  onClose, 
  callbackUrl,
  title = "Get Started",
  subtitle = "Sign in to your account or create a new one"
}: AuthModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size="md" radius="xl" color="blue" variant="light">
            <IconUserPlus size={16} />
          </ThemeIcon>
          <div>
            <Text fw={600} size="lg">
              {title}
            </Text>
            <Text size="sm" c="dimmed">
              {subtitle}
            </Text>
          </div>
        </Group>
      }
      size="lg"
      radius="lg"
      centered
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
      styles={{
        content: {
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
        },
        header: {
          paddingBottom: '12px',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          marginBottom: '16px',
        },
        body: {
          padding: '20px',
          paddingTop: '0',
          maxHeight: 'calc(90vh - 80px)',
          overflowY: 'auto',
        },
      }}
      closeButtonProps={{
        icon: <IconX size={20} />,
        size: "md",
      }}
    >
      <Stack gap="md">
        <AuthForm 
          callbackUrl={callbackUrl ?? "/"}
          className="border-0 shadow-none p-0"
        />
        
        <Text size="xs" ta="center" c="dimmed">
          By continuing, you agree to our{" "}
          <Text component="a" href="/terms" target="_blank" td="underline" c="blue" size="xs">
            Terms of Service
          </Text>
          {" "}and{" "}
          <Text component="a" href="/privacy" target="_blank" td="underline" c="blue" size="xs">
            Privacy Policy
          </Text>
        </Text>
      </Stack>
    </Modal>
  );
}