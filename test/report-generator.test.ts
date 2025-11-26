import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';
import { generateReport } from '../lib/report-generator.js';
import type { ComparisonResult } from '../lib/image-comparer.js';
import type { ScannedFile } from '../lib/file-scanner.js';
import type { PngFilePair } from '../lib/png-file-pair.js';

// Helper to create a mock PngFilePair for testing
function createMockPair(name: string, outputDir: string): PngFilePair {
  const mockPng = new PNG({ width: 1, height: 1 });
  return {
    name,
    outputDir,
    width: 1,
    height: 1,
    baselinePng: mockPng,
    candidatePng: mockPng,
    get baselineData() {
      return mockPng.data;
    },
    get candidateData() {
      return mockPng.data;
    },
    get hasDimensionMismatch() {
      return false;
    },
    get baselinePath() {
      return join(outputDir, `${name.replace(/\.png$/i, '')}-baseline.png`);
    },
    get candidatePath() {
      return join(outputDir, `${name.replace(/\.png$/i, '')}-candidate.png`);
    },
    get diffPath() {
      return join(outputDir, `${name.replace(/\.png$/i, '')}-diff.png`);
    },
  } as unknown as PngFilePair;
}

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
    it('should create index.html file', () => {
      const comparisonResults: ComparisonResult[] = [];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      expect(existsSync(join(testDir, 'index.html'))).toBe(true);
    });

    it('should include summary with counts', () => {
      const comparisonResults: ComparisonResult[] = [
        {
          pair: createMockPair('changed.png', testDir),
          hasDifference: true,
          diffPercentage: 25.5,
        },
      ];
      const baselineOnly: ScannedFile[] = [{ name: 'deleted.png', path: '/baseline/deleted.png' }];
      const candidateOnly: ScannedFile[] = [{ name: 'new.png', path: '/candidate/new.png' }];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const html = readFileSync(join(testDir, 'index.html'), 'utf-8');

      expect(html).toContain('Visual Diff Report');
      expect(html).toMatch(/total.*3/i);
      expect(html).toMatch(/different.*1/i);
      expect(html).toMatch(/removed.*1/i);
      expect(html).toMatch(/added.*1/i);
    });

    it('should show three images side-by-side for differences', () => {
      const comparisonResults: ComparisonResult[] = [
        {
          pair: createMockPair('changed.png', testDir),
          hasDifference: true,
          diffPercentage: 15.75,
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const html = readFileSync(join(testDir, 'index.html'), 'utf-8');

      // Should reference all three images
      expect(html).toContain('changed-baseline.png');
      expect(html).toContain('changed-candidate.png');
      expect(html).toContain('changed-diff.png');
      expect(html).toContain('15.75');
    });

    it('should handle dimension mismatch display', () => {
      const comparisonResults: ComparisonResult[] = [
        {
          pair: createMockPair('mismatched.png', testDir),
          hasDifference: true,
          diffPercentage: 100,
          dimensionMismatch: { baseline: '10x20', candidate: '20x30' },
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const html = readFileSync(join(testDir, 'index.html'), 'utf-8');

      expect(html).toContain('Dimension mismatch');
      expect(html).toContain('10x20');
      expect(html).toContain('20x30');
    });

    it('should show status indicator', () => {
      const comparisonResults: ComparisonResult[] = [
        {
          pair: createMockPair('changed.png', testDir),
          hasDifference: true,
          diffPercentage: 15.75,
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const html = readFileSync(join(testDir, 'index.html'), 'utf-8');

      expect(html.toLowerCase()).toMatch(/fail|❌|✗/);
    });

    it('should show success status when no differences', () => {
      const comparisonResults: ComparisonResult[] = [
        {
          pair: createMockPair('unchanged.png', testDir),
          hasDifference: false,
          diffPercentage: 0,
        },
      ];
      const baselineOnly: ScannedFile[] = [];
      const candidateOnly: ScannedFile[] = [];

      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir);

      const html = readFileSync(join(testDir, 'index.html'), 'utf-8');

      expect(html.toLowerCase()).toMatch(/pass|✓|✔/);
    });
  });
});
