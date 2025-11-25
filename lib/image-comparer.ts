import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { writeFileSync } from 'fs';
import type { PngFilePair } from './png-file-pair.js';

/**
 * Result of comparing two images
 */
export interface ComparisonResult {
  /** The filename that was compared */
  name: string;
  /** Whether the images have visual differences */
  hasDifference: boolean;
  /** Percentage of different pixels (0-100) */
  diffPercentage: number;
  /** Path to the generated diff image */
  diffImagePath: string;
  /** Optional dimension mismatch info if images have different dimensions */
  dimensionMismatch?: {
    baseline: string;
    candidate: string;
  };
}

/**
 * Compares two PNG images using pixelmatch and generates a diff image
 * @param filePair - The matched PNG file pair to compare
 * @param diffOutputPath - Path where the diff image should be written
 * @returns Comparison result with difference status and percentage
 */
export function compareImages(filePair: PngFilePair, diffOutputPath: string): ComparisonResult {
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

  writeFileSync(diffOutputPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  const diffPercentage = totalPixels > 0 ? (numDiffPixels / totalPixels) * 100 : 0;

  return {
    name: filePair.name,
    hasDifference: numDiffPixels > 0,
    diffPercentage,
    diffImagePath: diffOutputPath,
  };
}
