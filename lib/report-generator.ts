import { readFileSync, writeFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import { REPORT_FILENAME } from './constants.js';
import type { ComparisonResult } from './image-comparer.js';
import type { ScannedFile } from './file-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '../templates');

/**
 * Generates an HTML report with visual diff results
 * @param comparisonResults - Results from comparing matched image pairs
 * @param baselineOnly - Files that exist only in baseline
 * @param candidateOnly - Files that exist only in candidate
 * @param outputDir - Directory where the report file will be written
 */
export function generateReport(
  comparisonResults: ComparisonResult[],
  baselineOnly: ScannedFile[],
  candidateOnly: ScannedFile[],
  outputDir: string,
): void {
  const html = generateHTML(comparisonResults, baselineOnly, candidateOnly);
  writeFileSync(join(outputDir, REPORT_FILENAME), html);
}

/**
 * Generates the HTML content for the report
 */
function generateHTML(
  comparisonResults: ComparisonResult[],
  baselineOnly: ScannedFile[],
  candidateOnly: ScannedFile[],
): string {
  // Load and compile template
  const templateSource = readFileSync(join(TEMPLATES_DIR, 'report.html'), 'utf-8');
  const template = Handlebars.compile(templateSource);

  // Separate results into categories
  const withDifferences = comparisonResults.filter((r) => r.hasDifference);
  const withoutDifferences = comparisonResults.filter((r) => !r.hasDifference);

  // Calculate totals
  const totalImages = comparisonResults.length + baselineOnly.length + candidateOnly.length;
  const diffCount = withDifferences.length;
  const removedCount = baselineOnly.length;
  const addedCount = candidateOnly.length;

  // Determine status
  const hasFailed = diffCount > 0 || removedCount > 0;
  const statusEmoji = hasFailed ? '❌' : '✅';
  const statusText = hasFailed ? 'FAILED' : 'PASSED';

  // Prepare data for template
  const data = {
    statusEmoji,
    statusText,
    totalImages,
    diffCount,
    removedCount,
    addedCount,
    identicalCount: withoutDifferences.length,
    withDifferences: withDifferences.map((result) => ({
      name: result.pair.name,
      dimensionMismatch: result.dimensionMismatch,
      diffPercentage: result.diffPercentage.toFixed(2),
      baselineImage: basename(result.pair.baselinePath),
      diffImage: basename(result.pair.diffPath),
      candidateImage: basename(result.pair.candidatePath),
    })),
    withoutDifferences: withoutDifferences.map((result) => ({
      name: result.pair.name,
    })),
    baselineOnly: baselineOnly.map((file) => ({ name: file.name })),
    candidateOnly: candidateOnly.map((file) => ({ name: file.name })),
    hasRemovedOrAdded: baselineOnly.length > 0 || candidateOnly.length > 0,
  };

  return template(data);
}
