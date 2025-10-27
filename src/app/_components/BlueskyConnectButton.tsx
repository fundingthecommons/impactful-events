"use client";

import { useState } from "react";
import {
  Button,
  Modal,
  Stack,
  TextInput,
  PasswordInput,
  Text,
  Group,
  Alert,
  Badge,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconBrandTwitter, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { AtpAgent } from "@atproto/api";

interface BlueskyConnectButtonProps {
  projectTitle: string;
  projectUrl?: string;
}

interface BlueskyConnection {
  handle: string;
  isConnected: boolean;
}

export default function BlueskyConnectButton({ 
  projectTitle, 
  projectUrl 
}: BlueskyConnectButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [connection, setConnection] = useState<BlueskyConnection | null>(null);
  const [agent, setAgent] = useState<AtpAgent | null>(null);

  const form = useForm({
    initialValues: {
      handle: "",
      password: "", // App password, not main account password
    },
    validate: {
      handle: (value) => {
        if (!value) return "Handle is required";
        // Basic handle validation - can be @handle.bsky.social or handle.bsky.social
        const cleanHandle = value.replace("@", "");
        if (!cleanHandle.includes(".")) {
          return "Handle must include domain (e.g., user.bsky.social)";
        }
        return null;
      },
      password: (value) => {
        if (!value) return "App password is required";
        if (value.length < 4) return "App password seems too short";
        return null;
      },
    },
  });

  const handleConnect = async (values: typeof form.values) => {
    setIsConnecting(true);
    
    try {
      // Create new AT Protocol agent
      const newAgent = new AtpAgent({
        service: "https://bsky.social",
      });

      // Clean the handle (remove @ if present)
      const cleanHandle = values.handle.replace("@", "");

      // Login with handle and app password
      await newAgent.login({
        identifier: cleanHandle,
        password: values.password,
      });

      // Store connection info and agent
      setAgent(newAgent);
      setConnection({
        handle: cleanHandle,
        isConnected: true,
      });

      setIsModalOpen(false);
      form.reset();

      notifications.show({
        title: "Connected to Bluesky!",
        message: `Successfully connected as @${cleanHandle}`,
        color: "blue",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error("Bluesky connection error:", error);
      
      let errorMessage = "Failed to connect to Bluesky";
      if (error instanceof Error) {
        if (error.message.includes("Invalid identifier or password")) {
          errorMessage = "Invalid handle or app password. Make sure you're using an app password, not your main password.";
        } else if (error.message.includes("network")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      notifications.show({
        title: "Connection Failed",
        message: errorMessage,
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePost = async () => {
    if (!agent || !connection) return;

    setIsPosting(true);

    try {
      // Create a post about the project
      const postText = `🚀 Check out my project: ${projectTitle}${projectUrl ? `\n\n${projectUrl}` : ""}\n\n#BuildingInPublic #FundingTheCommons`;

      await agent.post({
        text: postText,
        createdAt: new Date().toISOString(),
      });

      notifications.show({
        title: "Posted to Bluesky!",
        message: "Successfully shared your project on Bluesky",
        color: "blue",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error("Bluesky post error:", error);
      
      notifications.show({
        title: "Post Failed",
        message: "Failed to post to Bluesky. Please try again.",
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleDisconnect = () => {
    setAgent(null);
    setConnection(null);
    
    notifications.show({
      title: "Disconnected",
      message: "Disconnected from Bluesky",
      color: "gray",
    });
  };

  if (connection?.isConnected) {
    return (
      <Group gap="md">
        <Group gap="xs">
          <Badge variant="light" color="blue" size="sm">
            <Group gap={4}>
              <IconBrandTwitter size={12} />
              @{connection.handle}
            </Group>
          </Badge>
        </Group>
        <Group gap="xs">
          <Button
            size="sm"
            variant="light"
            color="blue"
            onClick={handlePost}
            loading={isPosting}
            leftSection={<IconBrandTwitter size={14} />}
          >
            Share on Bluesky
          </Button>
          <Button
            size="sm"
            variant="subtle"
            color="gray"
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        </Group>
      </Group>
    );
  }

  return (
    <>
      <Button
        variant="light"
        color="blue"
        size="sm"
        leftSection={<IconBrandTwitter size={14} />}
        onClick={() => setIsModalOpen(true)}
      >
        Connect Bluesky
      </Button>

      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Connect to Bluesky"
        size="md"
      >
        <form onSubmit={form.onSubmit(handleConnect)}>
          <Stack gap="md">
            <Alert color="blue" variant="light">
              <Text size="sm">
                Connect your Bluesky account to share updates about your project.
                You&apos;ll need to use an <strong>App Password</strong> (not your main password).
              </Text>
            </Alert>

            <TextInput
              label="Bluesky Handle"
              placeholder="your-handle.bsky.social"
              description="Your Bluesky handle (with or without @)"
              required
              {...form.getInputProps("handle")}
            />

            <PasswordInput
              label="App Password"
              placeholder="Enter your Bluesky app password"
              description={
                <Text size="xs" c="dimmed">
                  Create an app password in Bluesky Settings → Privacy and Security → App Passwords
                </Text>
              }
              required
              {...form.getInputProps("password")}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isConnecting}>
                Connect
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}