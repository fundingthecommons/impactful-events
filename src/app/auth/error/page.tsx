"use client";

import { useSearchParams } from "next/navigation";
import { Container, Title, Text, Button, Stack, Alert, Paper } from "@mantine/core";
import { IconAlertTriangle, IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";

const errorMessages = {
  OAuthAccountNotLinked: "Account linking issue resolved! Please try signing in again.",
  AccessDenied: "Access was denied. Please check your permissions.",
  Verification: "The verification token has expired or has already been used.",
  Default: "An authentication error occurred. Please try again.",
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  
  const errorMessage = error && error in errorMessages 
    ? errorMessages[error as keyof typeof errorMessages]
    : errorMessages.Default;

  return (
    <Container size="sm" py="xl">
      <Paper shadow="md" p="xl" radius="md" ta="center">
        <Stack gap="lg">
          <IconAlertTriangle size={60} color="orange" style={{ margin: '0 auto' }} />
          
          <Stack gap="sm">
            <Title order={2} c="orange">
              Authentication Error
            </Title>
            <Text size="lg" c="dimmed">
              {errorMessage}
            </Text>
          </Stack>

          {error && (
            <Alert color="orange" variant="light">
              <Text size="sm">
                Error code: <code>{error}</code>
              </Text>
            </Alert>
          )}
          
          <Stack gap="sm">
            <Link href="/api/auth/signin" style={{ textDecoration: 'none' }}>
              <Button size="lg" fullWidth>
                Try Sign In Again
              </Button>
            </Link>
            
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Button 
                variant="outline"
                leftSection={<IconArrowLeft size={16} />}
                size="md"
                fullWidth
              >
                Go to Homepage
              </Button>
            </Link>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}