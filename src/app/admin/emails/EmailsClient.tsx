"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Table,
  Text,
  Title,
  Badge,
  Container,
  Group,
  Stack,
  Loader,
  Center,
  Pagination,
  ActionIcon,
  Tooltip,
  Modal,
  ScrollArea,
  TextInput,
} from "@mantine/core";
import { IconMail, IconEye, IconRefresh, IconSearch, IconX } from "@tabler/icons-react";
import { useDebouncedValue } from "@mantine/hooks";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import { useDisclosure } from "@mantine/hooks";
import type { RouterOutputs } from "~/trpc/react";

const ITEMS_PER_PAGE = 50;

type Email = RouterOutputs["email"]["getAllSentEmails"]["emails"][0];

export function EmailsClient() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [debouncedSearchEmail] = useDebouncedValue(searchEmail, 300);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchEmail]);

  const { data, isLoading, refetch } = api.email.getAllSentEmails.useQuery(
    {
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
      searchEmail: debouncedSearchEmail || undefined,
    },
    {
      // Only fetch when debounced value is stable
      enabled: true,
      // Prevent refetch on window focus during search
      refetchOnWindowFocus: false,
      // Use stable cache time
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 1;

  const handleViewEmail = useCallback((email: Email) => {
    setSelectedEmail(email);
    openModal();
  }, [openModal]);

  // Memoize email rows to prevent unnecessary re-renders
  const emailRows = useMemo(() => {
    if (!data?.emails) return [];
    
    return data.emails.map((email) => (
      <Table.Tr key={email.id}>
        <Table.Td>
          {email.sentAt
            ? format(new Date(email.sentAt), "MMM d, yyyy h:mm a")
            : "N/A"}
        </Table.Td>
        <Table.Td>
          <Stack gap={2}>
            <Text size="sm" fw={500}>
              {email.toEmail}
            </Text>
            {email.application?.user?.name && (
              <Text size="xs" c="dimmed">
                {email.application.user.name}
              </Text>
            )}
          </Stack>
        </Table.Td>
        <Table.Td>
          <Text size="sm" lineClamp={1}>
            {email.subject}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{email.event?.name ?? "N/A"}</Text>
        </Table.Td>
        <Table.Td>
          <Badge
            size="sm"
            variant="light"
            color={
              email.type === "MISSING_INFO"
                ? "yellow"
                : email.type === "STATUS_UPDATE"
                ? "blue"
                : "gray"
            }
          >
            {email.type.replace("_", " ")}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Tooltip label="View Email">
            <ActionIcon
              onClick={() => handleViewEmail(email)}
              variant="light"
            >
              <IconEye size={16} />
            </ActionIcon>
          </Tooltip>
        </Table.Td>
      </Table.Tr>
    ));
  }, [data?.emails, handleViewEmail]);

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!data) {
    return (
      <Container size="xl" py="xl">
        <Text>No data available</Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Sent Emails</Title>
            <Text size="sm" c="dimmed" mt={4}>
              View all emails that have been sent from the platform
            </Text>
          </div>
          <Group>
            <Badge size="lg" variant="light">
              {debouncedSearchEmail 
                ? `${data?.total ?? 0} results found` 
                : `Total: ${data?.total ?? 0} emails`
              }
            </Badge>
            <Tooltip label="Refresh">
              <ActionIcon
                onClick={() => void refetch()}
                variant="light"
                size="lg"
              >
                <IconRefresh size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Search Input */}
        <TextInput
          placeholder="Search by email address..."
          value={searchEmail}
          onChange={(event) => setSearchEmail(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          rightSection={
            searchEmail ? (
              <ActionIcon
                variant="subtle"
                onClick={() => setSearchEmail("")}
                size="sm"
              >
                <IconX size={16} />
              </ActionIcon>
            ) : null
          }
          style={{ maxWidth: 400 }}
        />

        <Card withBorder>
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Sent Date</Table.Th>
                  <Table.Th>To</Table.Th>
                  <Table.Th>Subject</Table.Th>
                  <Table.Th>Event</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.emails.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" py="xl" c="dimmed">
                        {debouncedSearchEmail 
                          ? `No emails found matching "${debouncedSearchEmail}"`
                          : "No sent emails found"
                        }
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  data.emails.map((email) => (
                    <Table.Tr key={email.id}>
                      <Table.Td>
                        {email.sentAt
                          ? format(new Date(email.sentAt), "MMM d, yyyy h:mm a")
                          : "N/A"}
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text size="sm" fw={500}>
                            {email.toEmail}
                          </Text>
                          {email.application?.user?.name && (
                            <Text size="xs" c="dimmed">
                              {email.application.user.name}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={1}>
                          {email.subject}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{email.event?.name ?? "N/A"}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="sm"
                          variant="light"
                          color={
                            email.type === "MISSING_INFO"
                              ? "yellow"
                              : email.type === "STATUS_UPDATE"
                              ? "blue"
                              : "gray"
                          }
                        >
                          {email.type.replace("_", " ")}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label="View Email">
                          <ActionIcon
                            onClick={() => handleViewEmail(email)}
                            variant="light"
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>

        {totalPages > 1 && (
          <Group justify="center">
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={totalPages}
            />
          </Group>
        )}
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={
          <Group>
            <IconMail size={20} />
            <Text fw={600}>Email Details</Text>
          </Group>
        }
        size="lg"
      >
        {selectedEmail && (
          <Stack gap="md">
            <div>
              <Text size="xs" c="dimmed">
                To
              </Text>
              <Text>{selectedEmail.toEmail}</Text>
            </div>

            <div>
              <Text size="xs" c="dimmed">
                Subject
              </Text>
              <Text>{selectedEmail.subject}</Text>
            </div>

            <div>
              <Text size="xs" c="dimmed">
                Sent At
              </Text>
              <Text>
                {selectedEmail?.sentAt
                  ? format(new Date(selectedEmail.sentAt), "MMM d, yyyy h:mm:ss a")
                  : "N/A"}
              </Text>
            </div>

            {selectedEmail.event && (
              <div>
                <Text size="xs" c="dimmed">
                  Event
                </Text>
                <Text>{selectedEmail.event.name}</Text>
              </div>
            )}

            {selectedEmail.postmarkId && (
              <div>
                <Text size="xs" c="dimmed">
                  Postmark ID
                </Text>
                <Text size="sm" style={{ fontFamily: "monospace" }}>
                  {selectedEmail.postmarkId}
                </Text>
              </div>
            )}

            <div>
              <Text size="xs" c="dimmed" mb="xs">
                Email Content (HTML)
              </Text>
              <ScrollArea h={300} offsetScrollbars>
                <div
                  dangerouslySetInnerHTML={{
                    __html: selectedEmail.htmlContent,
                  }}
                  style={{
                    border: "1px solid #e0e0e0",
                    padding: "16px",
                    borderRadius: "4px",
                    backgroundColor: "#f9f9f9",
                  }}
                />
              </ScrollArea>
            </div>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}