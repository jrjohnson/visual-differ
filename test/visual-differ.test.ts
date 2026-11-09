import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { TestDirectory } from './helpers/test-utils.js';
import { compareDirectories, type CompareResult } from '../lib/visual-differ.js';

describe('visual-differ', () => {
  const testDir = new TestDirectory(join(process.cwd(), 'test-fixtures-visual-differ'));

  beforeEach(() => {
    testDir.setup();
  });

  afterEach(() => {
    testDir.cleanup();
  });

  describe('compareDirectories', () => {
    it('should return exit code 0 when all images are identical', () => {
      testDir.writeBaseline('image1.png', 'red');
      testDir.writeCandidate('image1.png', 'red');

      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
      );

      expect(result.exitCode).toBe(0);
      expect(result.totalImages).toBe(1);
      expect(result.withDifferences).toBe(0);
      expect(result.withoutDifferences).toBe(1);
    });

    it('should return exit code 1 when images have differences', () => {
      testDir.writeBaseline('image1.png', 'red');
      testDir.writeCandidate('image1.png', 'blue');

      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
      );

      expect(result.exitCode).toBe(1);
      expect(result.totalImages).toBe(1);
      expect(result.withDifferences).toBe(1);
      expect(result.withoutDifferences).toBe(0);
    });

    it('should return exit code 1 when baseline files are missing', () => {
      testDir.writeBaseline('deleted.png', 'red');

      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
      );

      expect(result.exitCode).toBe(1);
      expect(result.totalImages).toBe(1);
      expect(result.removedFiles).toBe(1);
    });

    it('should return exit code 0 with only new candidate files', () => {
      testDir.writeCandidate('new.png', 'red');

      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
      );

      expect(result.exitCode).toBe(0);
      expect(result.totalImages).toBe(1);
      expect(result.addedFiles).toBe(1);

      // Added screenshot is copied into images/new/ for report display
      expect(existsSync(join(testDir.imagesDir, 'new', 'new.png'))).toBe(true);
    });

    it('should generate diff images for changed files', () => {
      testDir.writeBaseline('changed.png', 'red');
      testDir.writeCandidate('changed.png', 'blue');

      compareDirectories(testDir.baselineDir, testDir.candidateDir, testDir.outputDir);

      expect(existsSync(join(testDir.imagesDir, 'changed-diff.png'))).toBe(true);
    });

    it('should generate index.html report', () => {
      testDir.writeBaseline('image1.png', 'red');
      testDir.writeCandidate('image1.png', 'red');

      compareDirectories(testDir.baselineDir, testDir.candidateDir, testDir.outputDir);

      expect(existsSync(join(testDir.outputDir, 'index.html'))).toBe(true);
    });

    it('should handle multiple images correctly', () => {
      testDir.writeBaseline('same.png', 'red');
      testDir.writeBaseline('different.png', 'red');
      testDir.writeBaseline('deleted.png', 'red');

      testDir.writeCandidate('same.png', 'red');
      testDir.writeCandidate('different.png', 'blue');
      testDir.writeCandidate('new.png', 'red');

      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
      );

      expect(result.exitCode).toBe(1);
      expect(result.totalImages).toBe(4);
      expect(result.withDifferences).toBe(1);
      expect(result.withoutDifferences).toBe(1);
      expect(result.removedFiles).toBe(1);
      expect(result.addedFiles).toBe(1);
    });

    it('should throw error if baseline directory does not exist', () => {
      const nonExistent = join(testDir.root, 'does-not-exist');

      expect(() =>
        compareDirectories(nonExistent, testDir.candidateDir, testDir.outputDir),
      ).toThrow();
    });

    it('should throw error if candidate directory does not exist', () => {
      const nonExistent = join(testDir.root, 'does-not-exist');

      expect(() =>
        compareDirectories(testDir.baselineDir, nonExistent, testDir.outputDir),
      ).toThrow();
    });

    it('should provide summary information in result', () => {
      testDir.writeBaseline('image1.png', 'red');
      testDir.writeCandidate('image1.png', 'blue');

      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
      );

      expect(result).toHaveProperty('exitCode');
      expect(result).toHaveProperty('totalImages');
      expect(result).toHaveProperty('withDifferences');
      expect(result).toHaveProperty('withoutDifferences');
      expect(result).toHaveProperty('removedFiles');
      expect(result).toHaveProperty('addedFiles');
    });

    it('should handle dimension mismatches gracefully', () => {
      testDir.writeBaseline('mismatch.png', 'red'); // 1x1
      testDir.writeCandidate('mismatch.png', 'largeRed'); // 2x2
      testDir.writeBaseline('normal.png', 'red');
      testDir.writeCandidate('normal.png', 'red');

      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
      );

      expect(result.exitCode).toBe(1);
      expect(result.totalImages).toBe(2);
      expect(result.withDifferences).toBe(1); // mismatch counted as different
      expect(result.withoutDifferences).toBe(1); // normal is identical
    });

    it('should handle channel-count mismatches gracefully', () => {
      // Same width/height, but 'red' is RGBA and 'greyscale' is 2-channel greyscale + alpha,
      // Fast-png decodes these as objects with different channel lengths,
      // which must be caught before reaching pixelmatch.
      testDir.writeBaseline('mismatch.png', 'red');
      testDir.writeCandidate('mismatch.png', 'greyscale');
      testDir.writeBaseline('normal.png', 'red');
      testDir.writeCandidate('normal.png', 'red');

      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
      );

      expect(result.exitCode).toBe(1);
      expect(result.totalImages).toBe(2);
      expect(result.withDifferences).toBe(1); // channel mismatch counted as different
      expect(result.withoutDifferences).toBe(1); // normal is identical
    });

    it('should show channel mismatch info in report', () => {
      testDir.writeBaseline('mismatch.png', 'greyscale');
      testDir.writeCandidate('mismatch.png', 'greyscale');

      compareDirectories(testDir.baselineDir, testDir.candidateDir, testDir.outputDir);

      const html = readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');
      expect(html).toContain('Unsupported number of channels');
      expect(html).toContain('Baseline 2-channels, Candidate 2-channels');
    });

    it('should handle invalid PNG files gracefully', () => {
      testDir.writeBaseline('corrupt.png', 'corrupt');
      testDir.writeCandidate('corrupt.png', 'red');
      testDir.writeBaseline('normal.png', 'red');
      testDir.writeCandidate('normal.png', 'red');

      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
      );

      expect(result.exitCode).toBe(1);
      expect(result.totalImages).toBe(2);
      expect(result.withDifferences).toBe(1); // undecodable PNG counted as different
      expect(result.withoutDifferences).toBe(1); // normal is identical

      // Baseline/candidate are copied for inspection, but no diff image can be generated
      expect(existsSync(join(testDir.imagesDir, 'corrupt-baseline.png'))).toBe(true);
      expect(existsSync(join(testDir.imagesDir, 'corrupt-candidate.png'))).toBe(true);
      expect(existsSync(join(testDir.imagesDir, 'corrupt-diff.png'))).toBe(false);
    });

    it('should show PNG decoding error info in reports', () => {
      testDir.writeBaseline('corrupt.png', 'corrupt');
      testDir.writeCandidate('corrupt.png', 'red');

      compareDirectories(testDir.baselineDir, testDir.candidateDir, testDir.outputDir);

      const html = readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');
      expect(html).toContain('PNG decoding error');
      expect(html).toContain('baseline image (wrong PNG signature)');
      // Both images are still linked for review, but no diff image exists
      expect(html).toContain('images/corrupt-baseline.png');
      expect(html).toContain('images/corrupt-candidate.png');
      expect(html).not.toContain('images/corrupt-diff.png');

      const markdown = readFileSync(join(testDir.outputDir, 'report.md'), 'utf-8');
      expect(markdown).toContain('PNG decoding error');
      expect(markdown).toContain('baseline image: wrong PNG signature');
    });

    it('should show dimension mismatch info in report', () => {
      testDir.writeBaseline('mismatch.png', 'red'); // 1x1
      testDir.writeCandidate('mismatch.png', 'largeRed'); // 2x2

      compareDirectories(testDir.baselineDir, testDir.candidateDir, testDir.outputDir);

      const html = readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');
      expect(html).toContain('Dimension mismatch');
      expect(html).toContain('1x1');
      expect(html).toContain('2x2');
    });

    it('should handle unsupported bit depth gracefully', () => {
      testDir.writeBaseline('unsupported.png', 'red16Bit');
      testDir.writeCandidate('unsupported.png', 'red');
      testDir.writeBaseline('normal.png', 'red');
      testDir.writeCandidate('normal.png', 'red');

      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
      );

      expect(result.exitCode).toBe(1);
      expect(result.totalImages).toBe(2);
      expect(result.withDifferences).toBe(1); // unsupported bit depth counted as different
      expect(result.withoutDifferences).toBe(1); // normal is identical

      // Baseline/candidate are copied for inspection, but no diff image can be generated
      expect(existsSync(join(testDir.imagesDir, 'unsupported-baseline.png'))).toBe(true);
      expect(existsSync(join(testDir.imagesDir, 'unsupported-candidate.png'))).toBe(true);
      expect(existsSync(join(testDir.imagesDir, 'unsupported-diff.png'))).toBe(false);
    });

    it('should show unsupported bit depth info in report', () => {
      testDir.writeBaseline('unsupported.png', 'red16Bit');
      testDir.writeCandidate('unsupported.png', 'red');

      compareDirectories(testDir.baselineDir, testDir.candidateDir, testDir.outputDir);

      const html = readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');
      expect(html).toContain('Unsupported bit depth');
      expect(html).toContain('16-bit');
      expect(html).toContain('8-bit');
    });

    it('should process RGB/3-channel images successfully', () => {
      // redNoAlpha is a 3-channel RGB image, which pixelmatch cannot process.
      // however, we have a channel adjustment step in the workflow that backfills the missing
      // alpha-channel as needed before doing a comparison.
      // here, we check that this adjustment works as intended, and that the differ was able
      // to successfully compare these RGB images.
      testDir.writeBaseline('rgb.png', 'redNoAlpha');
      testDir.writeCandidate('rgb.png', 'redNoAlpha');

      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
      );

      expect(result.exitCode).toBe(0);
      expect(result.totalImages).toBe(1);
      expect(result.withDifferences).toBe(0);
      expect(result.withoutDifferences).toBe(1);
    });

    it('should accept custom threshold parameter', () => {
      testDir.writeBaseline('image1.png', 'red');
      testDir.writeCandidate('image1.png', 'blue');

      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
        0.5,
      );

      expect(result.exitCode).toBe(1);
      expect(result.withDifferences).toBe(1);
    });

    it('should pass threshold parameter through to image comparison', () => {
      testDir.writeBaseline('image1.png', 'red');
      testDir.writeBaseline('image2.png', 'red');
      testDir.writeCandidate('image1.png', 'blue');
      testDir.writeCandidate('image2.png', 'blue');

      // With threshold=1, all differences should be ignored
      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
        1,
      );

      expect(result.exitCode).toBe(0);
      expect(result.withDifferences).toBe(0);
      expect(result.withoutDifferences).toBe(2);
      // No diff files should be created when threshold=1
      expect(existsSync(join(testDir.imagesDir, 'image1-diff.png'))).toBe(false);
      expect(existsSync(join(testDir.imagesDir, 'image2-diff.png'))).toBe(false);
    });

    it('should detect differences with default threshold when not specified', () => {
      testDir.writeBaseline('image1.png', 'red');
      testDir.writeCandidate('image1.png', 'blue');

      // No threshold parameter provided, should use default
      const result: CompareResult = compareDirectories(
        testDir.baselineDir,
        testDir.candidateDir,
        testDir.outputDir,
      );

      expect(result.exitCode).toBe(1);
      expect(result.withDifferences).toBe(1);
      expect(existsSync(join(testDir.imagesDir, 'image1-diff.png'))).toBe(true);
    });
  });
});
