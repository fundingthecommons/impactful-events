"use client";

import { useState } from "react";
import { Button, Container, Title, Textarea, Paper, Alert, LoadingOverlay, Progress, Text, Group, Stack } from "@mantine/core";
import { IconUpload, IconCheck, IconX, IconAlertCircle } from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface ImportResult {
  synced: number;
  skipped: number;
  errors: Array<{ eventId: string; error: string }>;
}

interface EventsData {
  pageProps?: {
    allEvents: unknown[];
  };
  allEvents?: unknown[];
}

export default function CryptoNomadsImportPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncEventsMutation = api.event.syncEventsToNotion.useMutation();

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      setError("Please paste JSON data");
      return;
    }

    setIsLoading(true);
    setError(null);
    setImportResult(null);

    try {
      // Parse the JSON input
      const parsedData: EventsData = JSON.parse(jsonInput);
      
      // Extract events from the data structure
      let events: unknown[] = [];
      
      if (parsedData.pageProps?.allEvents) {
        events = parsedData.pageProps.allEvents;
      } else if (parsedData.allEvents) {
        events = parsedData.allEvents;
      } else if (Array.isArray(parsedData)) {
        events = parsedData;
      } else {
        throw new Error("Invalid JSON structure. Expected 'allEvents' array or pageProps.allEvents");
      }

      if (events.length === 0) {
        throw new Error("No events found in the JSON data");
      }

      // Call the tRPC endpoint - cast to expected type for the mutation
      const result = await syncEventsMutation.mutateAsync({ 
        events: events as Parameters<typeof syncEventsMutation.mutateAsync>[0]['events']
      });
      setImportResult(result);

    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON format. Please check your input.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setJsonInput("");
    setImportResult(null);
    setError(null);
  };

  const totalEvents = importResult ? importResult.synced + importResult.skipped : 0;
  const successRate = totalEvents > 0 ? (importResult!.synced / totalEvents) * 100 : 0;

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={1} ta="center" c="blue">
          🚀 Crypto Nomads Event Import
        </Title>
        
        <Text ta="center" c="dimmed" size="lg">
          Import events from crypto nomads JSON data to Notion database
        </Text>

        <Paper shadow="md" p="lg" radius="md" pos="relative">
          <LoadingOverlay visible={isLoading} />
          
          <Stack gap="md">
            <Title order={3}>📋 Paste JSON Data</Title>
            
            <Text size="sm" c="dimmed">
              Paste your events JSON data below. Supported formats:
              <br />• <code>{`{"pageProps": {"allEvents": [...]}}`}</code>
              <br />• <code>{`{"allEvents": [...]}`}</code>
              <br />• <code>{`[...]`}</code> (direct array)
            </Text>

            <Textarea
              placeholder={`[
      {
        "id": "recbkChR8Pf1kjjTi",
        "event": "Viva Frontier Tower Pop-up Village",
        "startDate": "2025-06-20",
        "endDate": "2025-08-04",
        ...
      }
    ]`}
              value={jsonInput}
              onChange={(event) => setJsonInput(event.currentTarget.value)}
              minRows={10}
              maxRows={20}
              autosize
              disabled={isLoading}
            />

            <Group justify="space-between">
              <Button
                variant="outline"
                color="gray"
                onClick={handleClear}
                disabled={isLoading || !jsonInput}
              >
                Clear
              </Button>
              
              <Button
                onClick={handleImport}
                disabled={isLoading || !jsonInput.trim()}
                leftSection={<IconUpload size={16} />}
                loading={isLoading}
              >
                Import to Notion
              </Button>
            </Group>
          </Stack>
        </Paper>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Import Error"
            color="red"
            variant="filled"
          >
            {error}
          </Alert>
        )}

        {importResult && (
          <Paper shadow="md" p="lg" radius="md">
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Title order={3}>📊 Import Results</Title>
                <IconCheck size={20} color="green" />
              </Group>

              <Progress
                value={successRate}
                color="green"
                size="lg"
                radius="xl"
                striped
                animated={successRate > 0}
              />

              <Group justify="space-between">
                <Group gap="xs">
                  <Text size="sm" c="green" fw={500}>
                    ✅ Synced: {importResult.synced}
                  </Text>
                  <Text size="sm" c="yellow" fw={500}>
                    ⏭️ Skipped: {importResult.skipped}
                  </Text>
                  <Text size="sm" c="red" fw={500}>
                    ❌ Errors: {importResult.errors.length}
                  </Text>
                </Group>
                <Text size="sm" c="dimmed">
                  {successRate.toFixed(1)}% success rate
                </Text>
              </Group>

              {importResult.errors.length > 0 && (
                <Alert
                  icon={<IconX size={16} />}
                  title="Import Errors"
                  color="red"
                  variant="light"
                >
                  <Stack gap="xs">
                    {importResult.errors.map((err, index) => (
                      <Text key={index} size="sm">
                        <strong>{err.eventId}:</strong> {err.error}
                      </Text>
                    ))}
                  </Stack>
                </Alert>
              )}

              {importResult.synced > 0 && (
                <Alert
                  icon={<IconCheck size={16} />}
                  title="Success!"
                  color="green"
                  variant="light"
                >
                  Successfully imported {importResult.synced} events to Notion! 
                  {importResult.skipped > 0 && ` (${importResult.skipped} were already present)`}
                </Alert>
              )}
            </Stack>
          </Paper>
        )}

        <Paper shadow="sm" p="md" radius="md" bg="gray.0">
          <Stack gap="xs">
            <Title order={4}>💡 Usage Tips</Title>
            <Text size="sm" c="dimmed">
              • The system automatically detects duplicate events by name
              <br />• Events are mapped to your Notion database schema
              <br />• Large imports are processed efficiently in batches
              <br />• Check the results section for any errors or skipped events
            </Text>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}