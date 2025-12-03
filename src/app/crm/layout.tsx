import { Container, Stack } from "@mantine/core";
import CRMNavigation from "~/app/_components/CRMNavigation";

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        <CRMNavigation />
        {children}
      </Stack>
    </Container>
  );
}
