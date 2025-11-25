import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { generateReport } from '../lib/report-generator.js';
import type { ComparisonResult } from '../lib/image-comparer.js';
import type { ScannedFile } from '../lib/file-scanner.js';

describe('report-generator', () => {
  const testDir = join(process.cwd(), 'test-fixtures-report');

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('generateReport', () => {
    it('should create OUTPUT.md file', () => {
      const comparisonResults: ComparisonResult[] = [];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      expect(existsSync(join(testDir, 'OUTPUT.md'))).toBe(true);
    });

    it('should include summary with counts', () => {
      const comparisonResults: ComparisonResult[] = [
        {
          name: 'changed.png',
          hasDifference: true,
          diffPercentage: 25.5,
          diffImagePath: join(testDir, 'changed-diff.png'),
        },
      ];
      const baselineOnly: ScannedFile[] = [
        { name: 'deleted.png', path: '/baseline/deleted.png' },
      ];
      const candidateOnly: ScannedFile[] = [
        { name: 'new.png', path: '/candidate/new.png' },
      ];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const markdown = readFileSync(join(testDir, 'OUTPUT.md'), 'utf-8');

      expect(markdown).toContain('# Visual Diff Report');
      expect(markdown).toMatch(/total.*3/i);
      expect(markdown).toMatch(/different.*1/i);
      expect(markdown).toMatch(/removed.*1/i);
      expect(markdown).toMatch(/added.*1/i);
    });

    it('should list images with differences first', () => {
      const comparisonResults: ComparisonResult[] = [
        {
          name: 'changed.png',
          hasDifference: true,
          diffPercentage: 25.5,
          diffImagePath: join(testDir, 'changed-diff.png'),
        },
        {
          name: 'unchanged.png',
          hasDifference: false,
          diffPercentage: 0,
          diffImagePath: join(testDir, 'unchanged-diff.png'),
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const markdown = readFileSync(join(testDir, 'OUTPUT.md'), 'utf-8');

      const changedIndex = markdown.indexOf('changed.png');
      const unchangedIndex = markdown.indexOf('unchanged.png');

      expect(changedIndex).toBeGreaterThan(0);
      expect(unchangedIndex).toBeGreaterThan(0);
      expect(changedIndex).toBeLessThan(unchangedIndex);
    });

    it('should include diff percentage for changed images', () => {
      const comparisonResults: ComparisonResult[] = [
        {
          name: 'changed.png',
          hasDifference: true,
          diffPercentage: 15.75,
          diffImagePath: join(testDir, 'changed-diff.png'),
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const markdown = readFileSync(join(testDir, 'OUTPUT.md'), 'utf-8');

      expect(markdown).toContain('15.75');
    });

    it('should list baseline-only files', () => {
      const comparisonResults: ComparisonResult[] = [];
      const baselineOnly: ScannedFile[] = [
        { name: 'deleted.png', path: '/baseline/deleted.png' },
      ];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const markdown = readFileSync(join(testDir, 'OUTPUT.md'), 'utf-8');

      expect(markdown).toContain('deleted.png');
    });

    it('should list candidate-only files', () => {
      const comparisonResults: ComparisonResult[] = [];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [
        { name: 'new.png', path: '/candidate/new.png' },
      ];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const markdown = readFileSync(join(testDir, 'OUTPUT.md'), 'utf-8');

      expect(markdown).toContain('new.png');
    });

    it('should include status indicator', () => {
      const comparisonResults: ComparisonResult[] = [
        {
          name: 'changed.png',
          hasDifference: true,
          diffPercentage: 15.75,
          diffImagePath: join(testDir, 'changed-diff.png'),
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const markdown = readFileSync(join(testDir, 'OUTPUT.md'), 'utf-8');

      expect(markdown.toLowerCase()).toMatch(/fail|❌|✗/);
    });

    it('should show success status when no differences', () => {
      const comparisonResults: ComparisonResult[] = [
        {
          name: 'unchanged.png',
          hasDifference: false,
          diffPercentage: 0,
          diffImagePath: join(testDir, 'unchanged-diff.png'),
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const markdown = readFileSync(join(testDir, 'OUTPUT.md'), 'utf-8');

      expect(markdown.toLowerCase()).toMatch(/pass|✓|✔/);
    });

    it('should handle filenames with spaces in markdown images', () => {
      const comparisonResults: ComparisonResult[] = [
        {
          name: 'my image with spaces.png',
          hasDifference: true,
          diffPercentage: 50,
          diffImagePath: join(testDir, 'my image with spaces.png-diff.png'),
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const markdown = readFileSync(join(testDir, 'OUTPUT.md'), 'utf-8');

      // Should use angle bracket syntax for paths with spaces: ![alt](<path with spaces>)
      expect(markdown).toMatch(/!\[.*\]\(<.*my.*image.*with.*spaces.*>\)/);
    });
  });
});
