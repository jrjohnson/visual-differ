import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TestDirectory } from './helpers/test-utils.js';
import { generateReport } from '../lib/report-generator.js';
import type { ComparisonResult } from '../lib/image-comparer.js';
import type { ScannedFile } from '../lib/file-scanner.js';

describe('report-generator', () => {
  const testDir = new TestDirectory(join(process.cwd(), 'test-fixtures-report'));

  beforeEach(() => {
    testDir.setup();
  });

  afterEach(() => {
    testDir.cleanup();
  });

  describe('generateReport', () => {
    it('should create index.html file', () => {
      const comparisonResults: ComparisonResult[] = [];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir.outputDir);

      expect(existsSync(join(testDir.outputDir, 'index.html'))).toBe(true);
    });

    it('should include summary with counts', () => {
      const pair = testDir.createPngFilePair('changed.png', 'red', 'blue');
      const comparisonResults: ComparisonResult[] = [
        {
          pair,
          hasDifference: true,
          diffPercentage: 25.5,
        },
      ];
      const baselineOnly: ScannedFile[] = [{ name: 'deleted.png', path: '/baseline/deleted.png' }];
      const candidateOnly: ScannedFile[] = [{ name: 'new.png', path: '/candidate/new.png' }];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir.outputDir);

      const html = readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');

      expect(html).toContain('Visual Diff Report');
      expect(html).toMatch(/total.*3/i);
      expect(html).toMatch(/different.*1/i);
      expect(html).toMatch(/removed.*1/i);
      expect(html).toMatch(/added.*1/i);
    });

    it('should show three images side-by-side for differences', () => {
      const pair = testDir.createPngFilePair('changed.png', 'red', 'blue');
      const comparisonResults: ComparisonResult[] = [
        {
          pair,
          hasDifference: true,
          diffPercentage: 15.75,
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir.outputDir);

      const html = readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');

      // Should reference all three images with images/ prefix
      expect(html).toContain('images/changed-baseline.png');
      expect(html).toContain('images/changed-candidate.png');
      expect(html).toContain('images/changed-diff.png');
      expect(html).toContain('15.75');
    });

    it('should handle dimension mismatch display', () => {
      const pair = testDir.createPngFilePair('mismatched.png', 'red', 'largeRed');
      const comparisonResults: ComparisonResult[] = [
        {
          pair,
          hasDifference: true,
          diffPercentage: 100,
          dimensionMismatch: { baseline: '10x20', candidate: '20x30' },
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir.outputDir);

      const html = readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');

      expect(html).toContain('Dimension mismatch');
      expect(html).toContain('10x20');
      expect(html).toContain('20x30');
      expect(html).toContain('images/mismatched-baseline.png');
      expect(html).not.toContain('images/mismatched-diff.png');
      expect(html).toContain('images/mismatched-candidate.png');
    });

    it('should show status indicator', () => {
      const pair = testDir.createPngFilePair('changed.png', 'red', 'blue');
      const comparisonResults: ComparisonResult[] = [
        {
          pair,
          hasDifference: true,
          diffPercentage: 15.75,
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir.outputDir);

      const html = readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');

      expect(html.toLowerCase()).toMatch(/fail|❌|✗/);
    });

    it('should show success status when no differences', () => {
      const pair = testDir.createPngFilePair('unchanged.png', 'red', 'red');
      const comparisonResults: ComparisonResult[] = [
        {
          pair,
          hasDifference: false,
          diffPercentage: 0,
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir.outputDir);

      const html = readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');

      expect(html.toLowerCase()).toMatch(/pass|✓|✔/);
    });
  });
});
