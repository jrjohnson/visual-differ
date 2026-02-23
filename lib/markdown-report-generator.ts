import { writeFileSync } from 'fs';
import { join } from 'path';
import { MARKDOWN_REPORT_FILENAME } from './constants.js';
import type { ComparisonResult } from './image-comparer.js';
import type { ScannedFile } from './file-scanner.js';

// Generates a markdown report and writes it to the output directory
export function generateMarkdownReport(
  comparisonResults: ComparisonResult[],
  baselineOnly: ScannedFile[],
  candidateOnly: ScannedFile[],
  outputDir: string,
): void {
  const markdown = generateMarkdown(comparisonResults, baselineOnly, candidateOnly);
  writeFileSync(join(outputDir, MARKDOWN_REPORT_FILENAME), markdown);
}

// Builds the full markdown string from comparison data
function generateMarkdown(
  comparisonResults: ComparisonResult[],
  baselineOnly: ScannedFile[],
  candidateOnly: ScannedFile[],
): string {
  const withDifferences = comparisonResults.filter((r) => r.hasDifference);
  const withoutDifferences = comparisonResults.filter((r) => !r.hasDifference);

  const totalImages = comparisonResults.length + baselineOnly.length + candidateOnly.length;
  const diffCount = withDifferences.length;
  const removedCount = baselineOnly.length;
  const addedCount = candidateOnly.length;
  const identicalCount = withoutDifferences.length;

  const hasFailed = diffCount > 0 || removedCount > 0;
  const statusEmoji = hasFailed ? '❌' : '✅';
  const statusText = hasFailed ? 'FAILED' : 'PASSED';

  const lines: string[] = [];

  // Status header
  lines.push(`### ${statusEmoji} Visual Diff Report — ${statusText}`);
  lines.push('');

  // Summary line
  const parts: string[] = [];
  if (diffCount > 0) parts.push(`**${diffCount}** different`);
  if (removedCount > 0) parts.push(`**${removedCount}** removed`);
  if (addedCount > 0) parts.push(`**${addedCount}** added`);
  if (identicalCount > 0) parts.push(`**${identicalCount}** identical`);
  lines.push(`**${totalImages}** images compared: ${parts.join(' · ')}`);
  lines.push('');

  // Details section with all file lists
  const hasDetails =
    withDifferences.length > 0 || removedCount > 0 || addedCount > 0 || identicalCount > 0;

  if (hasDetails) {
    lines.push('<details>');
    lines.push('<summary>Details</summary>');
    lines.push('');

    if (withDifferences.length > 0) {
      lines.push(`#### Differences (${diffCount})`);
      lines.push('');
      lines.push('| File | Diff % | Notes |');
      lines.push('|------|--------|-------|');
      for (const result of withDifferences) {
        const notes = result.dimensionMismatch
          ? `⚠️ Dimension mismatch (${result.dimensionMismatch.baseline} → ${result.dimensionMismatch.candidate})`
          : '';
        lines.push(`| ${result.pair.name} | ${result.diffPercentage.toFixed(2)}% | ${notes} |`);
      }
      lines.push('');
    }

    if (removedCount > 0) {
      lines.push(`#### Removed Files (${removedCount})`);
      lines.push('');
      for (const file of baselineOnly) {
        lines.push(`- \`${file.name}\``);
      }
      lines.push('');
    }

    if (addedCount > 0) {
      lines.push(`#### Added Files (${addedCount})`);
      lines.push('');
      for (const file of candidateOnly) {
        lines.push(`- \`${file.name}\``);
      }
      lines.push('');
    }

    if (identicalCount > 0) {
      lines.push(`#### Identical Files (${identicalCount})`);
      lines.push('');
      for (const result of withoutDifferences) {
        lines.push(`- \`${result.pair.name}\``);
      }
      lines.push('');
    }

    lines.push('</details>');
    lines.push('');
  }

  return lines.join('\n');
}
