import { mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import { scanAndMatchFiles } from './file-scanner.js';
import { PngFilePair } from './png-file-pair.js';
import { compareImages } from './image-comparer.js';
import { calculateExitCode } from './exit-code-calculator.js';
import { generateReport } from './report-generator.js';
import { generateMarkdownReport } from './markdown-report-generator.js';
import { IMAGES_DIR, NEW_IMAGES_DIR } from './constants.js';
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

  // Create images subdirectory for diff output
  const imagesDir = join(outputDir, IMAGES_DIR);
  mkdirSync(imagesDir, { recursive: true });

  // Load and compare matched PNG pairs
  const comparisonResults: ComparisonResult[] = fileMatches.matched.map((matched) => {
    const pngPair = new PngFilePair(
      matched.name,
      { name: matched.name, path: matched.baselinePath },
      { name: matched.name, path: matched.candidatePath },
      imagesDir,
    );

    // Handle dimension mismatch - copy source images and treat as 100% different
    if (pngPair.hasDimensionMismatch) {
      copyFileSync(pngPair.baselineSourcePath, pngPair.baselinePath);
      copyFileSync(pngPair.candidateSourcePath, pngPair.candidatePath);

      return {
        name: pngPair.name,
        baselinePath: pngPair.baselinePath,
        candidatePath: pngPair.candidatePath,
        diffPath: pngPair.diffPath,
        hasDifference: true,
        diffPercentage: 100,
        dimensionMismatch: {
          baseline: `${pngPair.dimensionMismatch!.baselineWidth}x${pngPair.dimensionMismatch!.baselineHeight}, Data length: ${pngPair.dimensionMismatch!.baselineLength}`,
          candidate: `${pngPair.dimensionMismatch!.candidateWidth}x${pngPair.dimensionMismatch!.candidateHeight}, Data length: ${pngPair.dimensionMismatch!.candidateLength}`,
        },
      };
    }

    // Handle unsupported bit depth - pixelmatch can't compare 16-bit PNGs,
    // so copy source images and treat as 100% different
    if (pngPair.hasUnsupportedBitDepth) {
      copyFileSync(pngPair.baselineSourcePath, pngPair.baselinePath);
      copyFileSync(pngPair.candidateSourcePath, pngPair.candidatePath);

      return {
        name: pngPair.name,
        baselinePath: pngPair.baselinePath,
        candidatePath: pngPair.candidatePath,
        diffPath: pngPair.diffPath,
        hasDifference: true,
        diffPercentage: 100,
        unsupportedBitDepth: {
          baseline: `${pngPair.unsupportedBitDepth!.baselineDepth}-bit`,
          candidate: `${pngPair.unsupportedBitDepth!.candidateDepth}-bit`,
        },
      };
    }

    // No format issues - do normal comparison
    return compareImages(pngPair, threshold);
  });

  // Copy candidate-only (added) screenshots into images/new/ so the HTML report
  // can display them for review. They keep their original file names.
  if (fileMatches.candidateOnly.length > 0) {
    const newImagesDir = join(imagesDir, NEW_IMAGES_DIR);
    mkdirSync(newImagesDir, { recursive: true });
    for (const file of fileMatches.candidateOnly) {
      copyFileSync(file.path, join(newImagesDir, file.name));
    }
  }

  // Calculate exit code
  const exitCode = calculateExitCode(comparisonResults, fileMatches.baselineOnly);

  // Generate reports
  generateReport(comparisonResults, fileMatches.baselineOnly, fileMatches.candidateOnly, outputDir);
  generateMarkdownReport(
    comparisonResults,
    fileMatches.baselineOnly,
    fileMatches.candidateOnly,
    outputDir,
  );

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
