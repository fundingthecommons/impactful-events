"use client";

import { Component, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "~/lib/wagmi/config";

/**
 * Error boundary that catches Web3/WAAP initialization failures
 * so they don't blank the entire page.
 */
class Web3ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("[Web3Provider] Error caught by boundary:", error);
  }

  render() {
    if (this.state.hasError) {
      // Render children without Web3 context — app still works, wallet features disabled
      console.warn(
        "[Web3Provider] Rendering without Web3 context due to error:",
        this.state.error?.message,
      );
      return this.props.children;
    }
    return this.props.children;
  }
}

/**
 * Web3Provider wraps the application with WagmiProvider for wallet connectivity.
 * Placed inside TRPCReactProvider to share its QueryClientProvider.
 * Wrapped in error boundary so WAAP/wagmi failures don't blank the page.
 */
export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <Web3ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        {children}
      </WagmiProvider>
    </Web3ErrorBoundary>
  );
}
