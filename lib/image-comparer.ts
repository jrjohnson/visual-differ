import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { copyFileSync, writeFileSync } from 'fs';
import type { PngFilePair } from './png-file-pair.js';

/**
 * Result of comparing two images
 */
export interface ComparisonResult {
  /** The name of the compared file */
  name: string;
  /** Output path of the copied baseline image */
  baselinePath: string;
  /** Output path of the copied candidate image */
  candidatePath: string;
  /** Output path of the generated diff image */
  diffPath: string;
  /** Whether the images have visual differences */
  hasDifference: boolean;
  /** Percentage of different pixels (0-100) */
  diffPercentage: number;
  /** Optional dimension mismatch info if images have different dimensions */
  dimensionMismatch?: {
    baseline: string;
    candidate: string;
  };
}

/**
 * Compares two PNG images using pixelmatch and generates a diff image
 * @param filePair - The matched PNG file pair to compare
 * @param threshold - Optional pixelmatch threshold (0-1, lower = more sensitive)
 * @returns Comparison result with difference status and percentage
 */
export function compareImages(filePair: PngFilePair, threshold?: number): ComparisonResult {
  const { width, height } = filePair;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    filePair.baselineData,
    filePair.candidateData,
    diff.data,
    width,
    height,
    threshold !== undefined ? { threshold } : {},
  );

  const hasDifference = numDiffPixels > 0;
  const totalPixels = width * height;
  const diffPercentage = totalPixels > 0 ? (numDiffPixels / totalPixels) * 100 : 0;

  // Only write images if there are differences
  if (hasDifference) {
    writeFileSync(filePair.diffPath, PNG.sync.write(diff));
    copyFileSync(filePair.baselineSourcePath, filePair.baselinePath);
    copyFileSync(filePair.candidateSourcePath, filePair.candidatePath);
  }

  return {
    name: filePair.name,
    baselinePath: filePair.baselinePath,
    candidatePath: filePair.candidatePath,
    diffPath: filePair.diffPath,
    hasDifference,
    diffPercentage,
  };
}
