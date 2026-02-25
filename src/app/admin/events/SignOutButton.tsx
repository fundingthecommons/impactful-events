"use client";

import { Button } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";
import { useSignOut } from "~/hooks/useSignOut";

export default function SignOutButton() {
  const handleSignOut = useSignOut();

  return (
    <Button
      variant="light"
      size="sm"
      leftSection={<IconLogout size={16} />}
      onClick={() => void handleSignOut({ callbackUrl: '/' })}
    >
      Sign Out
    </Button>
  );
}