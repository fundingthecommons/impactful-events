"use client";

import { useState, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { getCsrfToken, signIn } from "next-auth/react";

import { createSiweMessage } from "~/lib/siwe/createMessage";
import { isWaaPConnector, type WaaPConnectorProperties } from "~/lib/wagmi/waapConnector";
import { wagmiConfig } from "~/lib/wagmi/config";

interface UseWaapAuthReturn {
  /** Connect wallet via WAAP and sign in to NextAuth */
  connectAndSignIn: (callbackUrl?: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  /** Disconnect wallet and clear state */
  disconnect: () => Promise<void>;
  /** Whether the WAAP connection flow is in progress */
  isConnecting: boolean;
  /** Whether the SIWE sign-in is in progress */
  isSigningIn: boolean;
  /** Error message if the flow failed */
  error: string | null;
  /** Connected wallet address (if connected) */
  address: string | undefined;
  /** Whether a wallet is currently connected */
  isConnected: boolean;
}

/**
 * Hook that orchestrates the full WAAP + NextAuth authentication flow:
 * 1. Connect wallet via WAAP SDK (opens modal for social/email/wallet options)
 * 2. Detect login method (social vs external wallet)
 * 3a. Social login: authenticate via verified email (no SIWE signing)
 * 3b. External wallet: create and sign SIWE message, submit to SIWE provider
 * 4. On error: disconnect wallet to prevent stale connector state
 */
export function useWaapAuth(): UseWaapAuthReturn {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectAndSignIn = useCallback(
    async (callbackUrl?: string): Promise<{ success: boolean; url?: string; error?: string }> => {
      setError(null);
      setIsConnecting(true);

      try {
        // Find the WAAP connector
        const waapConn = connectors.find((c) => isWaaPConnector(c));
        if (!waapConn) {
          throw new Error("WAAP connector not found. Please refresh the page.");
        }

        // Clear any stale connection from a previous session (e.g. user declined SIWE)
        try {
          await disconnectAsync();
        } catch {
          // Ignore — may not be connected
        }

        // 1. Connect wallet via WAAP (opens login modal)
        const connectResult = await connectAsync({ connector: waapConn });
        const connectedAddress = connectResult.accounts[0];
        const connectedChainId = connectResult.chainId;

        if (!connectedAddress) {
          throw new Error("No wallet address returned from WAAP");
        }

        setIsConnecting(false);
        setIsSigningIn(true);

        // 2. Detect login method to determine auth flow
        const connector = wagmiConfig.connectors.find((c) => isWaaPConnector(c));
        const waapMethods = connector as unknown as WaaPConnectorProperties | undefined;
        const loginMethod = waapMethods?.getLoginMethod?.() ?? null;

        console.log("[WAAP] Login method detected:", loginMethod);

        if (loginMethod === "waap") {
          // --- SOCIAL LOGIN FLOW (Google, Discord, email, phone via WAAP) ---
          // Skip SIWE signing; authenticate via verified email from OAuth provider

          let email: string | null = null;
          try {
            if (waapMethods && typeof waapMethods.requestEmail === "function") {
              email = await waapMethods.requestEmail();
            }
          } catch {
            console.log("[WAAP] Email request failed for social login");
          }

          if (!email) {
            throw new Error("Email is required for social login. Please try again.");
          }

          const result = await signIn("waap-social", {
            email,
            walletAddress: connectedAddress,
            chainId: String(connectedChainId),
            redirect: false,
            callbackUrl: callbackUrl ?? "/dashboard",
          });

          if (result?.error) {
            throw new Error(
              result.error === "CredentialsSignin"
                ? "Social wallet authentication failed. Please try again."
                : result.error,
            );
          }

          return { success: true, url: result?.url ?? undefined };
        } else {
          // --- EXTERNAL WALLET FLOW (MetaMask, WalletConnect, Human) ---
          // Require SIWE proof of wallet ownership

          let email: string | null = null;
          try {
            if (waapMethods && typeof waapMethods.requestEmail === "function") {
              email = await waapMethods.requestEmail();
            }
          } catch {
            console.log("[WAAP] Email request failed or declined, continuing without email");
          }

          const csrfToken = await getCsrfToken();
          if (!csrfToken) {
            throw new Error("Failed to get CSRF token");
          }

          const siweMessage = createSiweMessage({
            address: connectedAddress,
            chainId: connectedChainId,
            nonce: csrfToken,
            domain: window.location.host,
            uri: window.location.origin,
          });
          const messageStr = siweMessage.prepareMessage();

          const signature = await signMessageAsync({ message: messageStr });

          const result = await signIn("siwe", {
            message: messageStr,
            signature,
            email: email ?? "",
            csrfToken,
            redirect: false,
            callbackUrl: callbackUrl ?? "/dashboard",
          });

          if (result?.error) {
            throw new Error(
              result.error === "CredentialsSignin"
                ? "Wallet authentication failed. Please try again."
                : result.error,
            );
          }

          return { success: true, url: result?.url ?? undefined };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to connect wallet";
        setError(message);

        // Disconnect wallet on ANY error to prevent "Connector already connected"
        try {
          await disconnectAsync();
        } catch {
          // Ignore disconnect errors during cleanup
        }

        return { success: false, error: message };
      } finally {
        setIsConnecting(false);
        setIsSigningIn(false);
      }
    },
    [connectors, connectAsync, signMessageAsync, disconnectAsync],
  );

  const disconnect = useCallback(async () => {
    try {
      await disconnectAsync();
    } catch {
      // Ignore disconnect errors
    }
    try {
      if (typeof window !== "undefined") {
        const w = window as unknown as { waap?: { logout?: () => Promise<void> } };
        await w.waap?.logout?.();
      }
    } catch {
      // Ignore WAAP logout errors
    }
  }, [disconnectAsync]);

  return {
    connectAndSignIn,
    disconnect,
    isConnecting,
    isSigningIn,
    error,
    address,
    isConnected,
  };
}
