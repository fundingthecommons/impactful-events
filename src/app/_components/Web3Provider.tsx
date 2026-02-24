"use client";

import { type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "~/lib/wagmi/config";

/**
 * Web3Provider wraps the application with WagmiProvider for wallet connectivity.
 * Placed inside TRPCReactProvider to share its QueryClientProvider.
 */
export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      {children}
    </WagmiProvider>
  );
}
