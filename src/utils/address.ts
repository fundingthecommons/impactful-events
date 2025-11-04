/**
 * Address validation utilities
 * Simple Ethereum address validation without external dependencies
 */

/**
 * Check if a string is a valid Ethereum address
 */
export const isAddress = (value: string): boolean => {
  // Basic Ethereum address validation: 0x followed by 40 hex characters
  return /^0x[a-fA-F0-9]{40}$/.test(value);
};
