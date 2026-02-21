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

  describe('lightbox', () => {
    function generateAndRead(
      comparisonResults: ComparisonResult[],
      baselineOnly: ScannedFile[] = [],
      candidateOnly: ScannedFile[] = [],
    ): string {
      generateReport(comparisonResults, baselineOnly, candidateOnly, testDir.outputDir);
      return readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');
    }

    it('should include a dialog element with accessible labeling', () => {
      const pair = testDir.createPngFilePair('a.png', 'red', 'blue');
      const html = generateAndRead([{ pair, hasDifference: true, diffPercentage: 10 }]);

      expect(html).toContain('<dialog id="lightbox" aria-label="Image viewer">');
      expect(html).toContain('aria-label="Close"');
      expect(html).toContain('aria-label="Previous image"');
      expect(html).toContain('aria-label="Next image"');
    });

    it('should include lightbox panel with image, caption, and counter', () => {
      const pair = testDir.createPngFilePair('a.png', 'red', 'blue');
      const html = generateAndRead([{ pair, hasDifference: true, diffPercentage: 10 }]);

      expect(html).toContain('class="lightbox-panel"');
      expect(html).toContain('class="lightbox-image"');
      expect(html).toContain('class="lightbox-caption"');
      expect(html).toContain('class="lightbox-counter"');
    });

    it('should wrap images in button triggers instead of anchor tags', () => {
      const pair = testDir.createPngFilePair('a.png', 'red', 'blue');
      const html = generateAndRead([{ pair, hasDifference: true, diffPercentage: 10 }]);

      expect(html).toContain('<button type="button" class="lightbox-trigger">');
      expect(html).not.toMatch(/<a href="images\//);
    });

    it('should render three triggers per normal diff group', () => {
      const pair = testDir.createPngFilePair('a.png', 'red', 'blue');
      const html = generateAndRead([{ pair, hasDifference: true, diffPercentage: 10 }]);

      const triggerCount = (html.match(/class="lightbox-trigger"/g) ?? []).length;
      expect(triggerCount).toBe(3);
    });

    it('should render two triggers for dimension mismatch groups', () => {
      const pair = testDir.createPngFilePair('a.png', 'red', 'largeRed');
      const html = generateAndRead([
        {
          pair,
          hasDifference: true,
          diffPercentage: 100,
          dimensionMismatch: { baseline: '1x1', candidate: '2x2' },
        },
      ]);

      const triggerCount = (html.match(/class="lightbox-trigger"/g) ?? []).length;
      expect(triggerCount).toBe(2);
    });

    it('should produce independent trigger groups for multiple diff rows', () => {
      const pairA = testDir.createPngFilePair('a.png', 'red', 'blue');
      const pairB = testDir.createPngFilePair('b.png', 'red', 'blue');
      const html = generateAndRead([
        { pair: pairA, hasDifference: true, diffPercentage: 10 },
        { pair: pairB, hasDifference: true, diffPercentage: 20 },
      ]);

      const groupCount = (html.match(/class="diff-images"/g) ?? []).length;
      expect(groupCount).toBe(2);

      const triggerCount = (html.match(/class="lightbox-trigger"/g) ?? []).length;
      expect(triggerCount).toBe(6);
    });

    it('should not render any lightbox triggers when there are no differences', () => {
      const pair = testDir.createPngFilePair('same.png', 'red', 'red');
      const html = generateAndRead([{ pair, hasDifference: false, diffPercentage: 0 }]);

      expect(html).not.toContain('class="lightbox-trigger"');
      expect(html).not.toContain('class="diff-images"');
    });

    it('should include the lightbox script with 2D grid navigation', () => {
      const pair = testDir.createPngFilePair('a.png', 'red', 'blue');
      const html = generateAndRead([{ pair, hasDifference: true, diffPercentage: 10 }]);

      expect(html).toContain('<script>');
      expect(html).toContain('.diff-images');
      expect(html).toContain('.lightbox-trigger');
      expect(html).toContain('ArrowLeft');
      expect(html).toContain('ArrowRight');
      expect(html).toContain('ArrowUp');
      expect(html).toContain('ArrowDown');
    });

    it('should include lightbox CSS with zoom-in cursor and dialog styles', () => {
      const pair = testDir.createPngFilePair('a.png', 'red', 'blue');
      const html = generateAndRead([{ pair, hasDifference: true, diffPercentage: 10 }]);

      expect(html).toContain('cursor: zoom-in');
      expect(html).toContain('#lightbox');
      expect(html).toContain('lightbox-fade-in');
      expect(html).toContain('object-fit: contain');
    });

    it('should render correct trigger counts with mixed normal and dimension mismatch rows', () => {
      const normalPair = testDir.createPngFilePair('normal.png', 'red', 'blue');
      const mismatchPair = testDir.createPngFilePair('mismatch.png', 'red', 'largeRed');
      const html = generateAndRead([
        { pair: normalPair, hasDifference: true, diffPercentage: 10 },
        {
          pair: mismatchPair,
          hasDifference: true,
          diffPercentage: 100,
          dimensionMismatch: { baseline: '1x1', candidate: '2x2' },
        },
      ]);

      const triggerCount = (html.match(/class="lightbox-trigger"/g) ?? []).length;
      expect(triggerCount).toBe(5);
    });
  });
});
