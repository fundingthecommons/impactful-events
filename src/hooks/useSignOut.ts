"use client";

import { useCallback } from "react";
import { signOut } from "next-auth/react";
import { useDisconnect } from "wagmi";

/**
 * Hook for signing out of both NextAuth and WAAP wallet.
 * Ensures wallet disconnect + WAAP logout + NextAuth sign-out.
 */
export function useSignOut() {
  const { disconnectAsync } = useDisconnect();

  const handleSignOut = useCallback(
    async (options?: { callbackUrl?: string }) => {
      // 1. Disconnect wagmi wallet
      try {
        await disconnectAsync();
      } catch {
        // Ignore - wallet may not be connected
      }

      // 2. Logout from WAAP SDK
      try {
        if (typeof window !== "undefined") {
          const w = window as unknown as { waap?: { logout?: () => Promise<void> } };
          await w.waap?.logout?.();
        }
      } catch {
        // Ignore - WAAP may not be initialized
      }

      // 3. Sign out from NextAuth
      await signOut(options);
    },
    [disconnectAsync],
  );

  return handleSignOut;
}
