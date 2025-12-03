import { writeFileSync } from 'fs';
import { PNG } from 'pngjs';
import { scanAndMatchFiles } from './file-scanner.js';
import { PngFilePair } from './png-file-pair.js';
import { compareImages } from './image-comparer.js';
import { calculateExitCode } from './exit-code-calculator.js';
import { generateReport } from './report-generator.js';
import type { ComparisonResult } from './image-comparer.js';

/**
 * Result of comparing two directories of screenshots
 */
export interface CompareResult {
  /** Exit code: 0 for success, 1 for failure */
  exitCode: number;
  /** Total number of images processed */
  totalImages: number;
  /** Number of images with visual differences */
  withDifferences: number;
  /** Number of identical images */
  withoutDifferences: number;
  /** Number of files only in baseline (removed) */
  removedFiles: number;
  /** Number of files only in candidate (added) */
  addedFiles: number;
}

/**
 * Compares two directories of PNG screenshots and generates a visual diff report
 *
 * @param baselineDir - Directory containing baseline (expected) screenshots
 * @param candidateDir - Directory containing candidate (actual) screenshots
 * @param outputDir - Directory where diff images and report will be written
 * @param threshold - Optional pixelmatch threshold (0-1, lower = more sensitive)
 * @returns Summary of comparison results
 * @throws Error if directories don't exist or comparison fails
 */
export function compareDirectories(
  baselineDir: string,
  candidateDir: string,
  outputDir: string,
  threshold?: number,
): CompareResult {
  // Scan and match files
  const fileMatches = scanAndMatchFiles(baselineDir, candidateDir);

  // Load and compare matched PNG pairs
  const comparisonResults: ComparisonResult[] = fileMatches.matched.map((matched) => {
    const pngPair = new PngFilePair(
      matched.name,
      { name: matched.name, path: matched.baselinePath },
      { name: matched.name, path: matched.candidatePath },
      outputDir,
    );

    // Handle dimension mismatch - write PNGs and treat as 100% different
    if (pngPair.hasDimensionMismatch) {
      writeFileSync(pngPair.baselinePath, PNG.sync.write(pngPair.baselinePng));
      writeFileSync(pngPair.candidatePath, PNG.sync.write(pngPair.candidatePng));

      return {
        pair: pngPair,
        hasDifference: true,
        diffPercentage: 100,
        dimensionMismatch: {
          baseline: `${pngPair.dimensionMismatch!.baselineWidth}x${pngPair.dimensionMismatch!.baselineHeight}`,
          candidate: `${pngPair.dimensionMismatch!.candidateWidth}x${pngPair.dimensionMismatch!.candidateHeight}`,
        },
      };
    }

    // No dimension mismatch - do normal comparison
    return compareImages(pngPair, threshold);
  });

  // Calculate exit code
  const exitCode = calculateExitCode(comparisonResults, fileMatches.baselineOnly);

  // Generate report
  generateReport(comparisonResults, fileMatches.baselineOnly, fileMatches.candidateOnly, outputDir);

  // Return summary
  const withDifferences = comparisonResults.filter((r) => r.hasDifference).length;
  const withoutDifferences = comparisonResults.filter((r) => !r.hasDifference).length;

  return {
    exitCode,
    totalImages:
      comparisonResults.length + fileMatches.baselineOnly.length + fileMatches.candidateOnly.length,
    withDifferences,
    withoutDifferences,
    removedFiles: fileMatches.baselineOnly.length,
    addedFiles: fileMatches.candidateOnly.length,
  };
}
