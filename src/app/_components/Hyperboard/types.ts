/**
 * Hyperboard Types
 * Core type definitions for the Hyperboard treemap visualization component
 */

import { type HierarchyNode } from "d3";

/**
 * Common data structure for hierarchy nodes
 */
export interface HyperboardData {
  type?: string;
  id?: string;
  name?: string;
  image?: string;
  avatar?: string | null;
  displayName?: string | null;
  value: number;
  isBlueprint?: boolean;
  children?: HyperboardEntry[];
}

/**
 * Entry data for individual tiles
 */
export interface HyperboardEntry {
  type: string;
  id: string;
  avatar?: string | null;
  displayName?: string | null;
  value: number;
  isBlueprint: boolean;
}

/**
 * Main component props
 */
export interface HyperboardProps {
  data: HyperboardEntry[];
  height: number;
  label: string;
  onClickLabel: () => void;
  grayscaleImages?: boolean;
  borderColor?: string;
  borderWidth?: number;
  imageObjectFit?: "cover" | "contain";
  logoSize?: string;
}

/**
 * D3 treemap leaf node type
 */
export type Leaf = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
} & HierarchyNode<HyperboardData>;
