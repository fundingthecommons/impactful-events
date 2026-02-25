import { http, createConfig } from "wagmi";
import {
  mainnet,
  optimism,
  base,
  polygon,
  arbitrum,
  sepolia,
} from "wagmi/chains";

import { waapConnector } from "./waapConnector";

/**
 * Wagmi configuration for the WAAP integration.
 * Chains align with the WalletChain Prisma enum (ETHEREUM, POLYGON, ARBITRUM, OPTIMISM, BASE).
 */
export const wagmiConfig = createConfig({
  chains: [mainnet, optimism, base, polygon, arbitrum, sepolia],
  connectors: [waapConnector()],
  transports: {
    [mainnet.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});

