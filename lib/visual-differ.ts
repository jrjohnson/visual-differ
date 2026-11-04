import { mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import { scanAndMatchFiles } from './file-scanner.js';
import { compareImages } from './image-comparer.js';
import { calculateExitCode } from './exit-code-calculator.js';
import { generateReport } from './report-generator.js';
import { generateMarkdownReport } from './markdown-report-generator.js';
import { IMAGES_DIR, NEW_IMAGES_DIR } from './constants.js';
import type { ComparisonResult } from './image-comparer.js';
import { PngFilePairFactory } from './png-file-pair-factory.js';
import {
  DimensionMismatchError,
  FilePairComparisonError,
  UnsupportedBitDepthError,
  UnsupportedNumberOfChannelsError,
} from './errors.js';

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
    try {
      const pngPair = PngFilePairFactory.create(
        matched.name,
        { name: matched.name, path: matched.baselinePath },
        { name: matched.name, path: matched.candidatePath },
        imagesDir,
      );
      return compareImages(pngPair, threshold);
    } catch (e) {
      if (e instanceof FilePairComparisonError) {
        copyFileSync(e.baselineSourcePath, e.baselinePath);
        copyFileSync(e.candidateSourcePath, e.candidatePath);
      }

      if (e instanceof DimensionMismatchError) {
        return {
          name: matched.name,
          baselinePath: e.baselinePath,
          candidatePath: e.candidatePath,
          diffPath: e.diffPath,
          hasDifference: true,
          diffPercentage: 100,
          dimensionMismatch: {
            baseline: `${e.dimensionMismatch.baselineWidth}x${e.dimensionMismatch.baselineHeight}, Data length: ${e.dimensionMismatch.baselineLength}`,
            candidate: `${e.dimensionMismatch.candidateWidth}x${e.dimensionMismatch.candidateHeight}, Data length: ${e.dimensionMismatch.candidateLength}`,
          },
        };
      } else if (e instanceof UnsupportedBitDepthError) {
        return {
          name: matched.name,
          baselinePath: e.baselinePath,
          candidatePath: e.candidatePath,
          diffPath: e.diffPath,
          hasDifference: true,
          diffPercentage: 100,
          unsupportedBitDepth: {
            baseline: `${e.unsupportedBitDepth.baselineDepth}-bit`,
            candidate: `${e.unsupportedBitDepth.candidateDepth}-bit`,
          },
        };
      } else if (e instanceof UnsupportedNumberOfChannelsError) {
        return {
          name: matched.name,
          baselinePath: e.baselinePath,
          candidatePath: e.candidatePath,
          diffPath: e.diffPath,
          hasDifference: true,
          diffPercentage: 100,
          unsupportedNumberOfChannels: {
            baseline: `${e.unsupportedNumberOfChannels.baselineNumberOfChannels}-channels`,
            candidate: `${e.unsupportedNumberOfChannels.candidateNumberOfChannels}-channels`,
          },
        };
      }
      // Re-throw any unhandled errors.
      throw e;
    }
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
