import { join } from 'path';
import { scanAndMatchFiles } from './file-scanner.js';
import { PngFilePair, DimensionMismatchError } from './png-file-pair.js';
import { compareImages, type ComparisonResult } from './image-comparer.js';
import { calculateExitCode } from './exit-code-calculator.js';
import { generateReport } from './report-generator.js';

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
 * @returns Summary of comparison results
 * @throws Error if directories don't exist or comparison fails
 */
export function compareDirectories(
  baselineDir: string,
  candidateDir: string,
  outputDir: string,
): CompareResult {
  // Scan and match files
  const fileMatches = scanAndMatchFiles(baselineDir, candidateDir);

  // Load and compare matched PNG pairs
  const comparisonResults: ComparisonResult[] = fileMatches.matched.map((matched) => {
    try {
      const pngPair = new PngFilePair(
        matched.name,
        { name: matched.name, path: matched.baselinePath },
        { name: matched.name, path: matched.candidatePath },
      );

      const diffPath = join(outputDir, `${matched.name}-diff.png`);
      return compareImages(pngPair, diffPath);
    } catch (error) {
      // Handle dimension mismatches gracefully by treating them as 100% different
      if (error instanceof DimensionMismatchError) {
        const diffPath = join(outputDir, `${matched.name}-diff.png`);
        return {
          name: matched.name,
          hasDifference: true,
          diffPercentage: 100,
          diffImagePath: diffPath,
          dimensionMismatch: {
            baseline: `${error.baselineWidth}x${error.baselineHeight}`,
            candidate: `${error.candidateWidth}x${error.candidateHeight}`,
          },
        };
      }
      // Re-throw unexpected errors
      throw error;
    }
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
