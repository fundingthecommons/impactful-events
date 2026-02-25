import { createConnector } from "@wagmi/core";
import {
  type WaaPEthereumProviderInterface,
  type InitWaaPOptions,
  initWaaP,
} from "@human.tech/waap-sdk";
import { type Address, getAddress } from "viem";

/**
 * Login method returned by the WAAP SDK.
 * Mirrors the SDK's internal LoginResponse type which is not publicly exported.
 */
type LoginResponse = "waap" | "human" | "injected" | "walletconnect" | null;

import { waapConfig } from "./waapConfig";

/** Type guard to identify the WAAP connector */
export function isWaaPConnector(
  connector: { id: string } | undefined,
): boolean {
  return connector?.id === "waap";
}

/**
 * Extended connector interface exposing WAAP-specific methods.
 */
export type WaaPConnectorProperties = {
  /** Get the user's login method after connection */
  getLoginMethod(): LoginResponse;
  /** Request the user's verified email from WAAP */
  requestEmail(): Promise<string | null>;
};

let waapProvider: WaaPEthereumProviderInterface | null = null;
let initPromise: Promise<WaaPEthereumProviderInterface> | null = null;

/**
 * Lazily initialize the WAAP SDK. Only called in the browser.
 * Returns the WaaP provider singleton.
 */
async function getWaaPProvider(
  config?: InitWaaPOptions,
): Promise<WaaPEthereumProviderInterface> {
  if (waapProvider) return waapProvider;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (typeof window === "undefined") {
      throw new Error("WAAP SDK requires a browser environment");
    }

    const provider = initWaaP(config ?? waapConfig);
    waapProvider = provider;
    return waapProvider;
  })();

  return initPromise;
}

/**
 * Custom wagmi connector for WAAP (Wallet as a Protocol).
 * Wraps the WAAP SDK's EIP-1193 provider as a standard wagmi connector.
 */
export function waapConnector(config?: InitWaaPOptions) {
  return createConnector<
    WaaPEthereumProviderInterface,
    WaaPConnectorProperties
  >((connectorConfig) => ({
    id: "waap",
    name: "WaaP",
    type: "waap",

    async setup() {
      // No-op: initialization is lazy on first connect
    },

    // @ts-expect-error: wagmi v3 connect uses conditional generic return type for withCapabilities
    // which cannot be satisfied in an implementation. WAAP always returns plain addresses.
    async connect(
      parameters?: {
        chainId?: number | undefined;
        isReconnecting?: boolean | undefined;
      },
    ) {
      const chainId = parameters?.chainId;
      const provider = await getWaaPProvider(config);

      // Open WAAP login modal
      const loginMethod = await provider.login();
      if (!loginMethod) {
        throw new Error("User cancelled WAAP login");
      }

      // Get connected accounts
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts[0]) {
        throw new Error("No accounts returned from WAAP");
      }

      const currentChainId = await this.getChainId();

      // Switch chain if requested and different from current
      if (chainId && chainId !== currentChainId) {
        await this.switchChain?.({ chainId });
      }

      // Set up event listeners
      provider.on("accountsChanged", this.onAccountsChanged);
      provider.on("chainChanged", this.onChainChanged);
      provider.on("disconnect", this.onDisconnect);

      return {
        accounts: accounts.map((a) => getAddress(a)) as readonly Address[],
        chainId: chainId ?? currentChainId,
      };
    },

    async disconnect() {
      const provider = await getWaaPProvider(config);

      provider.removeListener("accountsChanged", this.onAccountsChanged);
      provider.removeListener("chainChanged", this.onChainChanged);
      provider.removeListener("disconnect", this.onDisconnect);

      await provider.logout();
    },

    async getAccounts() {
      const provider = await getWaaPProvider(config);
      const accounts = (await provider.request({
        method: "eth_accounts",
      })) as string[];
      return accounts.map((a) => getAddress(a)) as readonly Address[];
    },

    async getChainId() {
      const provider = await getWaaPProvider(config);
      const chainIdHex = (await provider.request({
        method: "eth_chainId",
      })) as string;
      return Number(chainIdHex);
    },

    async getProvider() {
      return getWaaPProvider(config);
    },

    async isAuthorized() {
      try {
        const accounts = await this.getAccounts();
        return accounts.length > 0;
      } catch {
        return false;
      }
    },

    async switchChain({ chainId }) {
      const provider = await getWaaPProvider(config);
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      const chain = connectorConfig.chains.find((c) => c.id === chainId);
      if (!chain) throw new Error(`Chain ${chainId} not configured`);

      connectorConfig.emitter.emit("change", { chainId });
      return chain;
    },

    onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        connectorConfig.emitter.emit("disconnect");
      } else {
        connectorConfig.emitter.emit("change", {
          accounts: accounts.map((a) => getAddress(a)),
        });
      }
    },

    onChainChanged(chainId) {
      connectorConfig.emitter.emit("change", {
        chainId: Number(chainId),
      });
    },

    onDisconnect() {
      connectorConfig.emitter.emit("disconnect");
    },

    // --- WAAP-specific methods ---

    getLoginMethod() {
      if (!waapProvider) return null;
      return waapProvider.getLoginMethod();
    },

    async requestEmail(): Promise<string | null> {
      try {
        const provider = await getWaaPProvider(config);
        const email = await provider.requestEmail();
        return email as string | null;
      } catch {
        return null;
      }
    },
  }));
}
