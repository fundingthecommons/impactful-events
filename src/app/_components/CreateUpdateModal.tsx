"use client";

import { useState } from "react";
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Button,
  Group,
  Text,
  Box,
  SimpleGrid,
  Image,
  ActionIcon,
  Progress,
  FileButton,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconPlus, IconX } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import { MentionTextarea } from "~/app/_components/MentionTextarea";

interface CreateUpdateModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateUpdateModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  onSuccess,
}: CreateUpdateModalProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const utils = api.useUtils();

  const form = useForm({
    initialValues: {
      title: "",
      content: "",
      weekNumber: undefined as number | undefined,
      updateDate: new Date(),
      imageUrls: [] as string[],
      githubUrls: [] as string[],
      demoUrls: [] as string[],
      tags: [] as string[],
    },
  });

  const createUpdate = api.project.createProjectUpdate.useMutation({
    onSuccess: () => {
      void utils.project.getAllUpdates.invalidate();
      void utils.project.getUserProjectUpdates.invalidate();

      form.reset();
      onClose();

      notifications.show({
        title: "Success",
        message: "Update posted successfully",
        color: "green",
      });

      onSuccess?.();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleCreateUpdate = async (values: typeof form.values) => {
    await createUpdate.mutateAsync({
      projectId,
      title: values.title,
      content: values.content,
      weekNumber: values.weekNumber,
      updateDate: values.updateDate,
      imageUrls: values.imageUrls.filter((url) => url.trim() !== ""),
      githubUrls: values.githubUrls.filter((url) => url.trim() !== ""),
      demoUrls: values.demoUrls.filter((url) => url.trim() !== ""),
      tags: values.tags.filter((tag) => tag.trim() !== ""),
    });
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    setIsUploadingImage(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("image", file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/upload/project-image", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Upload failed");
      }

      const result = (await response.json()) as { imageUrl: string };

      // Add the uploaded image URL to the form's imageUrls array
      form.setFieldValue("imageUrls", [...form.values.imageUrls, result.imageUrl]);

      notifications.show({
        title: "Image uploaded",
        message: "Image added to update",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Upload failed",
        message: error instanceof Error ? error.message : "Failed to upload image",
        color: "red",
      });
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title={`Add Update to ${projectName}`}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleCreateUpdate)}>
        <Stack gap="md">
          <TextInput
            label="Update Title"
            placeholder="e.g., Implemented user authentication"
            required
            {...form.getInputProps("title")}
          />

          <MentionTextarea
            label="Description"
            placeholder="Describe what you've accomplished, challenges faced, next steps... (Use @ to mention users)"
            minRows={4}
            required
            value={form.values.content}
            onChange={(value) => form.setFieldValue("content", value)}
            error={
              typeof form.errors.content === "string"
                ? form.errors.content
                : undefined
            }
          />

          <NumberInput
            label="Week Number (Optional)"
            placeholder="Which week of the program?"
            min={1}
            max={20}
            {...form.getInputProps("weekNumber")}
          />

          <DatePickerInput
            label="Update Date"
            placeholder="When did this update occur?"
            value={form.values.updateDate}
            onChange={(value) => {
              const dateValue = value
                ? typeof value === "string"
                  ? new Date(value)
                  : value
                : new Date();
              form.setFieldValue("updateDate", dateValue);
            }}
            maxDate={new Date()}
            clearable
            required
          />

          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Update Images
            </Text>
            <Text size="xs" c="dimmed">
              Upload screenshots or demo images (JPG, PNG, GIF, or WebP, max 5MB
              each)
            </Text>

            {form.values.imageUrls.length > 0 && (
              <SimpleGrid cols={3} spacing="xs">
                {form.values.imageUrls.map((url, index) => (
                  <Box key={index} pos="relative">
                    <Image
                      src={url}
                      alt={`Update image ${index + 1}`}
                      radius="md"
                      h={120}
                      fit="cover"
                      style={{
                        border: "1px solid var(--mantine-color-gray-3)",
                      }}
                    />
                    <ActionIcon
                      color="red"
                      size="sm"
                      radius="xl"
                      variant="filled"
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                      }}
                      onClick={() => {
                        const newUrls = form.values.imageUrls.filter(
                          (_, i) => i !== index
                        );
                        form.setFieldValue("imageUrls", newUrls);
                      }}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  </Box>
                ))}
              </SimpleGrid>
            )}

            <Group>
              <FileButton
                onChange={handleImageUpload}
                accept="image/png,image/jpeg,image/gif,image/webp"
                disabled={isUploadingImage}
              >
                {(props) => (
                  <Button
                    {...props}
                    variant="light"
                    size="sm"
                    leftSection={<IconPlus size={16} />}
                    loading={isUploadingImage}
                  >
                    Upload Image
                  </Button>
                )}
              </FileButton>
            </Group>

            {isUploadingImage && (
              <Box>
                <Text size="sm" mb="xs">
                  Uploading...
                </Text>
                <Progress value={uploadProgress} size="sm" />
              </Box>
            )}

            <TextInput
              placeholder="Or paste image URL and press Enter"
              size="xs"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const url = event.currentTarget.value.trim();
                  if (url) {
                    form.setFieldValue("imageUrls", [
                      ...form.values.imageUrls,
                      url,
                    ]);
                    event.currentTarget.value = "";
                  }
                }
              }}
            />
          </Stack>

          <TextInput
            label="GitHub URLs (comma-separated)"
            placeholder="https://github.com/user/repo/commit/abc123, https://github.com/user/repo/pull/5"
            onChange={(event) => {
              const urls = event.target.value.split(",").map((url) => url.trim());
              form.setFieldValue("githubUrls", urls);
            }}
          />

          <TextInput
            label="Demo URLs (comma-separated)"
            placeholder="https://myproject.vercel.app, https://demo.example.com"
            onChange={(event) => {
              const urls = event.target.value.split(",").map((url) => url.trim());
              form.setFieldValue("demoUrls", urls);
            }}
          />

          <TextInput
            label="Tags (comma-separated)"
            placeholder="milestone, frontend, demo, challenge"
            onChange={(event) => {
              const tags = event.target.value.split(",").map((tag) => tag.trim());
              form.setFieldValue("tags", tags);
            }}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createUpdate.isPending}>
              Post Update
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
