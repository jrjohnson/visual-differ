import { writeFileSync } from 'fs';
import { join } from 'path';
import { MARKDOWN_REPORT_FILENAME, MAX_FILES_SHOWN } from './constants.js';
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

  const hasDetails = withDifferences.length > 0 || removedCount > 0 || addedCount > 0;

  if (hasDetails) {
    lines.push('<details>');
    lines.push('<summary>Details</summary>');
    lines.push('');

    if (withDifferences.length > 0) {
      const shown = withDifferences.slice(0, MAX_FILES_SHOWN);
      lines.push(`#### Differences (${diffCount})`);
      lines.push('');
      lines.push('| File | Diff % | Notes |');
      lines.push('|------|--------|-------|');
      for (const result of shown) {
        const notes = result.dimensionMismatch
          ? `⚠️ Dimension mismatch (${result.dimensionMismatch.baseline} → ${result.dimensionMismatch.candidate})`
          : '';
        lines.push(`| ${result.pair.name} | ${result.diffPercentage.toFixed(2)}% | ${notes} |`);
      }
      if (withDifferences.length > MAX_FILES_SHOWN) {
        lines.push(`| … and ${withDifferences.length - MAX_FILES_SHOWN} more | | |`);
      }
      lines.push('');
    }

    if (removedCount > 0) {
      const shown = baselineOnly.slice(0, MAX_FILES_SHOWN);
      lines.push(`#### Removed Files (${removedCount})`);
      lines.push('');
      for (const file of shown) {
        lines.push(`- \`${file.name}\``);
      }
      if (removedCount > MAX_FILES_SHOWN) {
        lines.push(`- … and ${removedCount - MAX_FILES_SHOWN} more`);
      }
      lines.push('');
    }

    if (addedCount > 0) {
      const shown = candidateOnly.slice(0, MAX_FILES_SHOWN);
      lines.push(`#### Added Files (${addedCount})`);
      lines.push('');
      for (const file of shown) {
        lines.push(`- \`${file.name}\``);
      }
      if (addedCount > MAX_FILES_SHOWN) {
        lines.push(`- … and ${addedCount - MAX_FILES_SHOWN} more`);
      }
      lines.push('');
    }

    lines.push('</details>');
    lines.push('');
  }

  return lines.join('\n');
}
