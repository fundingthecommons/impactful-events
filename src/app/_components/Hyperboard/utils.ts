/**
 * Hyperboard Utility Functions
 * Helper functions for address formatting, tooltip labels, and tile layout calculations
 */

import { isAddress } from "~/utils/address";

/**
 * Format Ethereum address to shortened version (0x1234...5678)
 */
export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Format tooltip label with display name and/or address
 */
export const formatTooltipLabel = (
  id: string,
  displayName?: string | null,
): string => {
  if (displayName === id) {
    return `${displayName}`;
  }

  const formattedId = isAddress(id) ? formatAddress(id) : id;

  if (!displayName) {
    return formattedId;
  }

  if (displayName === formattedId) {
    return `${displayName}`;
  }

  return `${displayName}, ${formattedId}`;
};

/**
 * Calculate tile layout based on dimensions
 * Returns appropriate font size and image size for the given tile dimensions
 */
export const getTileLayout = (
  width: number,
  height: number,
): { font: number; image: number } => {
  const fontLarge = 28;
  const fontMedium = 18;
  const fontSmall = 12;

  const imageLarge = 128;
  const imageMedium = 88;
  const imageSmall = 64;
  const imageNone = 0;

  if (height > 190) {
    if (width > 348) {
      return { font: fontLarge, image: imageLarge };
    }
    if (width <= 348 && width > 220) {
      return { font: fontLarge, image: imageLarge };
    }
    if (width <= 220 && width > 150) {
      return { font: fontMedium, image: imageLarge };
    }
    if (width <= 150 && width >= 64) {
      return { font: fontSmall, image: imageSmall };
    }
    if (width < 64) {
      return { font: fontSmall, image: imageNone };
    }
  }

  if (height > 120 && height <= 190) {
    if (width > 348) {
      return { font: fontLarge, image: imageLarge };
    }
    if (width <= 348 && width > 220) {
      return { font: fontMedium, image: imageMedium };
    }
    if (width <= 220 && width > 150) {
      return { font: fontSmall, image: imageMedium };
    }
    if (width <= 150 && width >= 64) {
      return { font: fontSmall, image: imageSmall };
    }
    if (width < 64) {
      return { font: fontSmall, image: imageNone };
    }
  }

  if (height <= 120) {
    if (width > 348) {
      return { font: fontLarge, image: imageMedium };
    }
    if (width <= 348 && width > 220) {
      return { font: fontLarge, image: imageSmall };
    }
    if (width <= 220 && width > 150) {
      return { font: fontSmall, image: imageSmall };
    }
    if (width <= 150 && width >= 64) {
      return { font: fontSmall, image: imageSmall };
    }
    if (width < 64) {
      return { font: fontSmall, image: imageNone };
    }
  }

  throw new Error(`Unknown tile layout for ${width}x${height}`);
};
