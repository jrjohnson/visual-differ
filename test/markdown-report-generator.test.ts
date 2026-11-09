import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TestDirectory, createComparison } from './helpers/test-utils.js';
import { generateMarkdownReport } from '../lib/markdown-report-generator.js';
import { MAX_FILES_SHOWN } from '../lib/constants.js';
import type { ComparisonResult } from '../lib/image-comparer.js';
import type { ScannedFile } from '../lib/file-scanner.js';

describe('markdown-report-generator', () => {
  const testDir = new TestDirectory(join(process.cwd(), 'test-fixtures-markdown-report'));

  beforeEach(() => {
    testDir.setup();
  });

  afterEach(() => {
    testDir.cleanup();
  });

  function generateAndRead(
    comparisonResults: ComparisonResult[],
    baselineOnly: ScannedFile[] = [],
    candidateOnly: ScannedFile[] = [],
  ): string {
    generateMarkdownReport(comparisonResults, baselineOnly, candidateOnly, testDir.outputDir);
    return readFileSync(join(testDir.outputDir, 'report.md'), 'utf-8');
  }

  describe('generateMarkdownReport', () => {
    it('should create report.md file', () => {
      generateMarkdownReport([], [], [], testDir.outputDir);

      expect(existsSync(join(testDir.outputDir, 'report.md'))).toBe(true);
    });

    it('should show PASSED status when no differences', () => {
      const md = generateAndRead([
        createComparison('same.png', testDir.outputDir, {
          hasDifference: false,
          diffPercentage: 0,
        }),
      ]);

      expect(md).toContain('✅');
      expect(md).toContain('PASSED');
    });

    it('should show FAILED status when differences exist', () => {
      const md = generateAndRead([
        createComparison('changed.png', testDir.outputDir, {
          hasDifference: true,
          diffPercentage: 25.5,
        }),
      ]);

      expect(md).toContain('❌');
      expect(md).toContain('FAILED');
    });

    it('should show FAILED status when files are removed', () => {
      const baselineOnly: ScannedFile[] = [{ name: 'deleted.png', path: '/baseline/deleted.png' }];
      const md = generateAndRead([], baselineOnly);

      expect(md).toContain('❌');
      expect(md).toContain('FAILED');
    });

    it('should include summary counts', () => {
      const comparisonResults: ComparisonResult[] = [
        createComparison('changed.png', testDir.outputDir, {
          hasDifference: true,
          diffPercentage: 25.5,
        }),
      ];
      const baselineOnly: ScannedFile[] = [{ name: 'deleted.png', path: '/baseline/deleted.png' }];
      const candidateOnly: ScannedFile[] = [{ name: 'new.png', path: '/candidate/new.png' }];

      const md = generateAndRead(comparisonResults, baselineOnly, candidateOnly);

      expect(md).toContain('**3** images compared');
      expect(md).toContain('**1** different');
      expect(md).toContain('**1** removed');
      expect(md).toContain('**1** added');
    });

    it('should list differences in a table with percentages', () => {
      const md = generateAndRead([
        createComparison('changed.png', testDir.outputDir, {
          hasDifference: true,
          diffPercentage: 15.75,
        }),
      ]);

      expect(md).toContain('#### Differences (1)');
      expect(md).toContain('changed.png');
      expect(md).toContain('15.75%');
    });

    it('should show dimension mismatch notes in table', () => {
      const md = generateAndRead([
        createComparison('mismatched.png', testDir.outputDir, {
          hasDifference: true,
          diffPercentage: 100,
          dimensionMismatch: { baseline: '10x20', candidate: '20x30' },
        }),
      ]);

      expect(md).toContain('Dimension mismatch');
      expect(md).toContain('10x20');
      expect(md).toContain('20x30');
    });

    it('should show unsupported bit depth notes in table', () => {
      const md = generateAndRead([
        createComparison('unsupported.png', testDir.outputDir, {
          hasDifference: true,
          diffPercentage: 100,
          unsupportedBitDepth: { baseline: '16-bit', candidate: '8-bit' },
        }),
      ]);

      expect(md).toContain('Unsupported bit depth');
      expect(md).toContain('16-bit');
      expect(md).toContain('8-bit');
    });

    it('should show unsupported number of channels notes in table', () => {
      const md = generateAndRead([
        createComparison('unsupported.png', testDir.outputDir, {
          hasDifference: true,
          diffPercentage: 100,
          unsupportedNumberOfChannels: { baseline: '2-channels', candidate: '4-channels' },
        }),
      ]);

      expect(md).toContain('Unsupported number of channels');
      expect(md).toContain('2-channels');
      expect(md).toContain('4-channels');
    });

    it('should show comparison error notes in table', () => {
      const md = generateAndRead([
        createComparison('errored.png', testDir.outputDir, {
          hasDifference: true,
          diffPercentage: 100,
          comparisonError: 'pixelmatch failed',
        }),
      ]);

      expect(md).toContain('Comparison error');
      expect(md).toContain('pixelmatch failed');
    });

    it('should list removed files', () => {
      const baselineOnly: ScannedFile[] = [{ name: 'removed.png', path: '/baseline/removed.png' }];
      const md = generateAndRead([], baselineOnly);

      expect(md).toContain('#### Removed Files (1)');
      expect(md).toContain('`removed.png`');
    });

    it('should list added files', () => {
      const candidateOnly: ScannedFile[] = [{ name: 'new.png', path: '/candidate/new.png' }];
      const md = generateAndRead([], [], candidateOnly);

      expect(md).toContain('#### Added Files (1)');
      expect(md).toContain('`new.png`');
    });

    it('should wrap file lists in a collapsible details section', () => {
      const md = generateAndRead([
        createComparison('changed.png', testDir.outputDir, {
          hasDifference: true,
          diffPercentage: 5,
        }),
      ]);

      expect(md).toContain('<details>');
      expect(md).toContain('<summary>Details</summary>');
      expect(md).toContain('</details>');
      const detailsCount = (md.match(/<details>/g) ?? []).length;
      expect(detailsCount).toBe(1);
    });

    it('should not list identical files', () => {
      const md = generateAndRead([
        createComparison('same.png', testDir.outputDir, {
          hasDifference: false,
          diffPercentage: 0,
        }),
      ]);

      expect(md).not.toContain('Identical Files');
      expect(md).toContain('**1** identical');
    });

    it('should omit sub-sections that have no entries', () => {
      const md = generateAndRead([
        createComparison('same.png', testDir.outputDir, {
          hasDifference: false,
          diffPercentage: 0,
        }),
      ]);

      expect(md).not.toContain('#### Differences');
      expect(md).not.toContain('#### Removed');
      expect(md).not.toContain('#### Added');
    });

    it('should truncate differences table to MAX_FILES_SHOWN', () => {
      const totalFiles = MAX_FILES_SHOWN + 2;
      const results: ComparisonResult[] = [];
      for (let i = 0; i < totalFiles; i++) {
        results.push(
          createComparison(`file-${i}.png`, testDir.outputDir, {
            hasDifference: true,
            diffPercentage: i + 1,
          }),
        );
      }
      const md = generateAndRead(results);

      expect(md).toContain(`#### Differences (${totalFiles})`);
      for (let i = 0; i < MAX_FILES_SHOWN; i++) {
        expect(md).toContain(`file-${i}.png`);
      }
      expect(md).not.toContain(`file-${MAX_FILES_SHOWN}.png`);
      expect(md).toContain('… and 2 more');
    });

    it('should handle empty inputs', () => {
      const md = generateAndRead([], [], []);

      expect(md).toContain('PASSED');
      expect(md).toContain('**0** images compared');
    });

    it('should handle multiple differences', () => {
      const md = generateAndRead([
        createComparison('a.png', testDir.outputDir, { hasDifference: true, diffPercentage: 10 }),
        createComparison('b.png', testDir.outputDir, { hasDifference: true, diffPercentage: 20 }),
      ]);

      expect(md).toContain('#### Differences (2)');
      expect(md).toContain('a.png');
      expect(md).toContain('b.png');
      expect(md).toContain('10.00%');
      expect(md).toContain('20.00%');
    });

    it('should include the generation timestamp in the footer', () => {
      const md = generateAndRead([]);

      expect(md).toContain('---');
      expect(md).toMatch(
        /\*Generated by visual-differ at \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\*/,
      );
    });
  });
});
