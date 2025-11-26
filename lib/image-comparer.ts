import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { writeFileSync } from 'fs';
import type { PngFilePair } from './png-file-pair.js';

/**
 * Result of comparing two images
 */
export interface ComparisonResult {
  /** The PNG file pair that was compared */
  pair: PngFilePair;
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
 * @returns Comparison result with difference status and percentage
 */
export function compareImages(filePair: PngFilePair): ComparisonResult {
  const { width, height } = filePair;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    filePair.baselineData,
    filePair.candidateData,
    diff.data,
    width,
    height,
    { threshold: 0.1 },
  );

  const hasDifference = numDiffPixels > 0;
  const totalPixels = width * height;
  const diffPercentage = totalPixels > 0 ? (numDiffPixels / totalPixels) * 100 : 0;

  // Only write images if there are differences
  if (hasDifference) {
    writeFileSync(filePair.diffPath, PNG.sync.write(diff));
    writeFileSync(filePair.baselinePath, PNG.sync.write(filePair.baselinePng));
    writeFileSync(filePair.candidatePath, PNG.sync.write(filePair.candidatePng));
  }

  return {
    pair: filePair,
    hasDifference,
    diffPercentage,
  };
}
