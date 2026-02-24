import { SiweMessage } from "siwe";

import { db } from "~/server/db";
import { isAddress } from "~/utils/address";

interface SiweVerificationResult {
  success: boolean;
  address: string;
  chainId: number;
}

/**
 * Verify a SIWE message signature server-side.
 * Checks signature validity, domain match, and nonce match.
 */
export async function verifySiweMessage(
  messageStr: string,
  signature: string,
  expectedNonce: string,
  expectedDomain: string,
): Promise<SiweVerificationResult> {
  const siweMessage = new SiweMessage(messageStr);

  const result = await siweMessage.verify({
    signature,
    nonce: expectedNonce,
    domain: expectedDomain,
  });

  if (!result.success) {
    throw new Error("SIWE signature verification failed");
  }

  return {
    success: true,
    address: siweMessage.address,
    chainId: siweMessage.chainId,
  };
}

/**
 * Map a chain ID to the Prisma WalletChain enum value.
 */
function chainIdToWalletChain(
  chainId: number,
): "ETHEREUM" | "POLYGON" | "ARBITRUM" | "OPTIMISM" | "BASE" | "OTHER" {
  switch (chainId) {
    case 1:
    case 11155111: // Sepolia
      return "ETHEREUM";
    case 137:
      return "POLYGON";
    case 42161:
      return "ARBITRUM";
    case 10:
      return "OPTIMISM";
    case 8453:
      return "BASE";
    default:
      return "OTHER";
  }
}

/**
 * Find an existing user by wallet address, or create a new one.
 * If an email is provided, attempts to link the wallet to an existing user with that email.
 */
export async function findOrCreateUserByWallet(
  address: string,
  chainId: number,
  email?: string | null,
  options?: { verified?: boolean },
): Promise<{
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
}> {
  if (!isAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }

  const chain = chainIdToWalletChain(chainId);
  const normalizedAddress = address.toLowerCase();

  // 1. Check if wallet already linked to a user
  const existingWallet = await db.walletAddress.findFirst({
    where: {
      address: { equals: normalizedAddress, mode: "insensitive" },
      chain,
    },
    include: {
      user: {
        select: { id: true, email: true, name: true, firstName: true, surname: true, role: true },
      },
    },
  });

  if (existingWallet) {
    const user = existingWallet.user;
    return {
      id: user.id,
      email: user.email,
      name:
        `${user.firstName ?? ""} ${user.surname ?? ""}`.trim() ||
        user.name,
      role: user.role,
    };
  }

  // 2. If email provided, try to match existing user by email
  if (email) {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, firstName: true, surname: true, role: true },
    });

    if (existingUser) {
      // Link wallet to existing user
      await db.walletAddress.create({
        data: {
          userId: existingUser.id,
          address: normalizedAddress,
          chain,
          isPrimary: true,
          isVerified: options?.verified ?? true,
          label: "WAAP Wallet",
        },
      });

      console.log(
        `[AUTH:SIWE] Linked wallet ${normalizedAddress} to existing user ${existingUser.id} (${normalizedEmail}) [verified=${String(options?.verified ?? true)}]`,
      );

      return {
        id: existingUser.id,
        email: existingUser.email,
        name:
          `${existingUser.firstName ?? ""} ${existingUser.surname ?? ""}`.trim() ||
          existingUser.name,
        role: existingUser.role,
      };
    }
  }

  // 3. No match found - create new user + wallet
  const newUser = await db.user.create({
    data: {
      email: email?.toLowerCase().trim() ?? null,
      role: "user",
      walletAddresses: {
        create: {
          address: normalizedAddress,
          chain,
          isPrimary: true,
          isVerified: options?.verified ?? true,
          label: "WAAP Wallet",
        },
      },
    },
    select: { id: true, email: true, name: true, role: true },
  });

  console.log(
    `[AUTH:SIWE] Created new user ${newUser.id} with wallet ${normalizedAddress} [verified=${String(options?.verified ?? true)}]`,
  );

  return newUser;
}
