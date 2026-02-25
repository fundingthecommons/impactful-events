import {
  type InitWaaPOptions,
  type AuthenticationMethod,
  type SocialProvider,
} from "@human.tech/waap-sdk";

/**
 * WAAP SDK initialization configuration.
 * Controls which auth methods are available in the WAAP modal.
 */
export const waapConfig: InitWaaPOptions = {
  useStaging:
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_WAAP_USE_STAGING === "true")
      : false,
  config: {
    authenticationMethods: [
      "email",
      "phone",
      "social",
    ] satisfies AuthenticationMethod[],
    allowedSocials: [
      "google",
      "discord",
      "twitter",
      "github",
    ] satisfies SocialProvider[],
    styles: {
      darkMode: false, // Will be controlled by theme context
    },
  },
  project: {
    name: "Funding the Commons",
    entryTitle: "Welcome to FtC",
  },
  // WalletConnect project ID (optional, for external wallet support)
  ...(typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    ? {
        walletConnectProjectId:
          process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      }
    : {}),
};
