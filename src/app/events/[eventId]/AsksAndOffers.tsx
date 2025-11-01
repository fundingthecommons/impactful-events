"use client";

import { useState } from "react";
import {
  Card,
  Tabs,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Modal,
  TextInput,
  Textarea,
  Paper,
  ActionIcon,
  Tooltip,
  Avatar,
} from "@mantine/core";
import {
  IconHandStop,
  IconGift,
  IconPlus,
  IconTrash,
  IconCheck,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { type Session } from "next-auth";
import { notifications } from "@mantine/notifications";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { useRouter } from "next/navigation";
import { LikeButton } from "~/app/_components/LikeButton";

interface AsksAndOffersProps {
  eventId: string;
  session: Session | null;
}

export function AsksAndOffers({ eventId, session }: AsksAndOffersProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>("asks");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"ASK" | "OFFER">("ASK");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const utils = api.useUtils();

  // Fetch all asks and offers
  const { data: asksData = [] } = api.askOffer.getEventAsksOffers.useQuery({
    eventId,
    type: "ASK",
    onlyActive: true,
  });

  const { data: offersData = [] } = api.askOffer.getEventAsksOffers.useQuery({
    eventId,
    type: "OFFER",
    onlyActive: true,
  });

  // Fetch user's asks and offers (used for marking own items)
  api.askOffer.getUserAsksOffers.useQuery(
    { eventId },
    { enabled: !!session }
  );

  // Mutations
  const createMutation = api.askOffer.create.useMutation({
    onSuccess: () => {
      void utils.askOffer.getEventAsksOffers.invalidate();
      void utils.askOffer.getUserAsksOffers.invalidate();
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      setTitleError("");
      setDescriptionError("");
      notifications.show({
        title: "Success",
        message: `${modalType === "ASK" ? "Ask" : "Offer"} created successfully`,
        color: "green",
      });
    },
    onError: (error) => {
      // Parse Zod validation errors
      try {
        const zodErrors = JSON.parse(error.message) as Array<{
          path: string[];
          message: string;
        }>;

        // Set field-specific errors
        zodErrors.forEach((err) => {
          if (err.path[0] === "title") {
            setTitleError(err.message);
          } else if (err.path[0] === "description") {
            setDescriptionError(err.message);
          }
        });

        notifications.show({
          title: "Validation Error",
          message: "Please check the form fields for errors",
          color: "red",
        });
      } catch {
        // If not a Zod error, show the error message directly
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      }
    },
  });

  const deleteMutation = api.askOffer.delete.useMutation({
    onSuccess: () => {
      void utils.askOffer.getEventAsksOffers.invalidate();
      void utils.askOffer.getUserAsksOffers.invalidate();
      notifications.show({
        title: "Success",
        message: "Deleted successfully",
        color: "green",
      });
    },
  });

  const markFulfilledMutation = api.askOffer.markFulfilled.useMutation({
    onSuccess: () => {
      void utils.askOffer.getEventAsksOffers.invalidate();
      void utils.askOffer.getUserAsksOffers.invalidate();
      notifications.show({
        title: "Success",
        message: "Marked as fulfilled",
        color: "green",
      });
    },
  });

  const handleOpenModal = (type: "ASK" | "OFFER") => {
    if (!session) {
      notifications.show({
        title: "Not Logged In",
        message: "Please log in to create asks and offers",
        color: "red",
      });
      return;
    }
    setModalType(type);
    setTitle("");
    setDescription("");
    setTitleError("");
    setDescriptionError("");
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    // Clear previous errors
    setTitleError("");
    setDescriptionError("");

    // Client-side validation
    let hasError = false;

    if (!title.trim()) {
      setTitleError("Title is required");
      hasError = true;
    } else if (title.trim().length < 3) {
      setTitleError("Title must be at least 3 characters");
      hasError = true;
    }

    if (!description.trim()) {
      setDescriptionError("Description is required");
      hasError = true;
    } else if (description.trim().length < 10) {
      setDescriptionError("Description must be at least 10 characters");
      hasError = true;
    }

    if (hasError) {
      notifications.show({
        title: "Validation Error",
        message: "Please check the form fields for errors",
        color: "red",
      });
      return;
    }

    createMutation.mutate({
      eventId,
      type: modalType,
      title: title.trim(),
      description: description.trim(),
      tags: [],
    });
  };

  const isOwnAskOffer = (userId: string) => {
    return session?.user?.id === userId;
  };

  const renderAskOfferCard = (item: typeof asksData[0]) => {
    const isOwn = isOwnAskOffer(item.userId);

    const handleCardClick = (e: React.MouseEvent) => {
      // Don't navigate if clicking on action buttons
      if ((e.target as HTMLElement).closest('button')) {
        return;
      }
      router.push(`/events/${eventId}/asks-offers/${item.id}`);
    };

    return (
      <Paper
        key={item.id}
        p="md"
        withBorder
        style={{
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '';
        }}
        onClick={handleCardClick}
      >
        <Group justify="space-between" align="flex-start" mb="xs">
          <Group gap="sm">
            <Avatar
              src={getAvatarUrl({
                customAvatarUrl: item.user.profile?.avatarUrl,
                oauthImageUrl: item.user.image,
                name: item.user.name,
                email: item.user.email,
              })}
              alt={item.user.name ?? "User"}
              size="sm"
              radius="xl"
            >
              {getAvatarInitials({
                name: item.user.name,
                email: item.user.email,
              })}
            </Avatar>
            <div>
              <Text fw={500} size="sm">
                {item.user.name}
              </Text>
              {item.user.profile?.jobTitle && (
                <Text size="xs" c="dimmed">
                  {item.user.profile.jobTitle}
                  {item.user.profile.company && ` at ${item.user.profile.company}`}
                </Text>
              )}
            </div>
          </Group>
          {isOwn && (
            <Group gap="xs">
              <Tooltip label="Mark as fulfilled">
                <ActionIcon
                  variant="subtle"
                  color="green"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    markFulfilledMutation.mutate({ id: item.id });
                  }}
                  loading={markFulfilledMutation.isPending}
                >
                  <IconCheck size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate({ id: item.id });
                  }}
                  loading={deleteMutation.isPending}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </Group>

        <Text fw={600} mb="xs">
          {item.title}
        </Text>
        <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
          {item.description}
        </Text>

        <Group gap="xs" mt="sm">
          {item.tags.map((tag, idx) => (
            <Badge key={idx} size="sm" variant="light">
              {tag}
            </Badge>
          ))}
          {isOwn && (
            <Badge size="sm" color="blue">
              Your {item.type.toLowerCase()}
            </Badge>
          )}
        </Group>

        <Group justify="flex-end" mt="sm">
          <div onClick={(e) => e.stopPropagation()}>
            <LikeButton
              updateId={item.id}
              initialLikeCount={item.likes.length}
              initialHasLiked={session?.user ? item.likes.some(like => like.userId === session.user.id) : false}
              userId={session?.user?.id}
              likeType="askOffer"
            />
          </div>
        </Group>
      </Paper>
    );
  };

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconHandStop size={20} />
            <Text fw={600}>Asks & Offers</Text>
          </Group>
          <Badge variant="light">
            {asksData.length + offersData.length} total
          </Badge>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow mb="md">
            <Tabs.Tab value="asks" leftSection={<IconHandStop size={16} />}>
              Asks
              <Badge ml="xs" size="sm" variant="light">
                {asksData.length}
              </Badge>
            </Tabs.Tab>
            <Tabs.Tab value="offers" leftSection={<IconGift size={16} />}>
              Offers
              <Badge ml="xs" size="sm" variant="light">
                {offersData.length}
              </Badge>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="asks">
            <Stack gap="md">
              {asksData.length === 0 ? (
                <Stack align="center" gap="md" py="xl">
                  <Text ta="center" c="dimmed">
                    No asks yet
                  </Text>
                  <Text ta="center" size="sm" c="dimmed">
                    Share what you&apos;re looking for help with
                  </Text>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleOpenModal("ASK")}
                    size="xs"
                  >
                    Add Ask
                  </Button>
                </Stack>
              ) : (
                <>
                  {asksData.slice(0, 3).map(renderAskOfferCard)}
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleOpenModal("ASK")}
                    variant="light"
                    size="xs"
                    fullWidth
                  >
                    Add Ask
                  </Button>
                </>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="offers">
            <Stack gap="md">
              {offersData.length === 0 ? (
                <Stack align="center" gap="md" py="xl">
                  <Text ta="center" c="dimmed">
                    No offers yet
                  </Text>
                  <Text ta="center" size="sm" c="dimmed">
                    Share what you can help others with
                  </Text>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleOpenModal("OFFER")}
                    size="xs"
                  >
                    Add Offer
                  </Button>
                </Stack>
              ) : (
                <>
                  {offersData.slice(0, 3).map(renderAskOfferCard)}
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleOpenModal("OFFER")}
                    variant="light"
                    size="xs"
                    fullWidth
                  >
                    Add Offer
                  </Button>
                </>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Card>

      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Create ${modalType === "ASK" ? "Ask" : "Offer"}`}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Title"
            placeholder={
              modalType === "ASK"
                ? "e.g., Looking for Solidity mentor"
                : "e.g., Can help with frontend development"
            }
            value={title}
            onChange={(e) => {
              setTitle(e.currentTarget.value);
              if (titleError) setTitleError("");
            }}
            error={titleError}
            description="Minimum 3 characters"
            required
            withAsterisk
          />
          <Textarea
            label="Description"
            placeholder="Provide more details..."
            value={description}
            onChange={(e) => {
              setDescription(e.currentTarget.value);
              if (descriptionError) setDescriptionError("");
            }}
            error={descriptionError}
            description="Minimum 10 characters - explain what you're looking for or offering"
            minRows={4}
            required
            withAsterisk
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createMutation.isPending}
              leftSection={<IconPlus size={16} />}
            >
              Create {modalType === "ASK" ? "Ask" : "Offer"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
