import { SiweMessage } from "siwe";

/**
 * Create a SIWE (Sign-In with Ethereum) message for authentication.
 * The message is signed by the user's wallet and verified server-side.
 */
export function createSiweMessage({
  address,
  chainId,
  nonce,
  domain,
  uri,
}: {
  address: string;
  chainId: number;
  nonce: string;
  domain: string;
  uri: string;
}): SiweMessage {
  const now = new Date();
  const expirationTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

  return new SiweMessage({
    domain,
    address,
    statement: "Sign in to Funding the Commons",
    uri,
    version: "1",
    chainId,
    nonce,
    issuedAt: now.toISOString(),
    expirationTime: expirationTime.toISOString(),
  });
}
