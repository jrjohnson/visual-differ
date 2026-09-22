import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { TestDirectory } from './helpers/test-utils.js';
import { compareImages, type ComparisonResult } from '../lib/image-comparer.js';

describe('image-comparer', () => {
  const testDir = new TestDirectory(join(process.cwd(), 'test-fixtures-comparer'));

  beforeEach(() => {
    testDir.setup();
  });

  afterEach(() => {
    testDir.cleanup();
  });

  describe('compareImages', () => {
    it('should detect identical images', () => {
      const pair = testDir.createPngFilePair('image.png', 'red', 'red');

      const result: ComparisonResult = compareImages(pair);

      expect(result.name).toBe('image.png');
      expect(result.hasDifference).toBe(false);
      expect(result.diffPercentage).toBe(0);
      // Images should not be written for identical results
      expect(existsSync(result.diffPath)).toBe(false);
    });

    it('should detect different images', () => {
      const pair = testDir.createPngFilePair('test.png', 'red', 'blue');

      const result: ComparisonResult = compareImages(pair);

      expect(result.name).toBe('test.png');
      expect(result.hasDifference).toBe(true);
      expect(result.diffPercentage).toBeGreaterThan(0);
      expect(existsSync(result.diffPath)).toBe(true);
      expect(existsSync(result.baselinePath)).toBe(true);
      expect(existsSync(result.candidatePath)).toBe(true);
    });

    it('should calculate correct diff percentage', () => {
      const pair = testDir.createPngFilePair('test.png', 'red', 'blue');

      const result: ComparisonResult = compareImages(pair);

      // For 1x1 image with one different pixel, it should be 100%
      expect(result.diffPercentage).toBe(100);
    });

    it('should accept custom threshold parameter', () => {
      const pair = testDir.createPngFilePair('test.png', 'red', 'blue');

      const result: ComparisonResult = compareImages(pair, 0.5);

      expect(result.name).toBe('test.png');
      expect(result.hasDifference).toBe(true);
      expect(result.diffPercentage).toBe(100);
    });

    it('should ignore all differences with threshold=1', () => {
      const pair = testDir.createPngFilePair('test.png', 'red', 'blue');

      const result: ComparisonResult = compareImages(pair, 1);

      expect(result.name).toBe('test.png');
      expect(result.hasDifference).toBe(false);
      expect(result.diffPercentage).toBe(0);
      // Images should not be written when no differences detected
      expect(existsSync(result.diffPath)).toBe(false);
    });

    it('should return a comparisonError result when given an unsupported 16-bit PNG', () => {
      // Callers should check PngFilePair.hasUnsupportedBitDepth before calling
      // compareImages; this documents what happens if that guard is skipped.
      const pair = testDir.createPngFilePair('test.png', 'red16Bit', 'red');

      const result = compareImages(pair);

      expect(result.hasDifference).toBe(true);
      expect(result.diffPercentage).toBe(100);
      expect(typeof result.comparisonError).toBe('string');
      expect(result.comparisonError!.length).toBeGreaterThan(0);
      // No diff image can be generated, but baseline/candidate are copied for review
      expect(existsSync(result.diffPath)).toBe(false);
      expect(existsSync(result.baselinePath)).toBe(true);
      expect(existsSync(result.candidatePath)).toBe(true);
    });

    it('should return a comparisonError result when pixelmatch throws on unsupported channel count', () => {
      // redNoAlpha is a 1x1 RGB PNG (3-byte data). It passes the dimension and
      // bit-depth guards (same w/h/length, both 8-bit) but pixelmatch expects
      // 4-channel data, so it throws when the output buffer size disagrees.
      const pair = testDir.createPngFilePair('test.png', 'redNoAlpha', 'redNoAlpha');

      const result = compareImages(pair);

      expect(result.hasDifference).toBe(true);
      expect(result.diffPercentage).toBe(100);
      expect(typeof result.comparisonError).toBe('string');
      expect(result.comparisonError!.length).toBeGreaterThan(0);
      expect(existsSync(result.diffPath)).toBe(false);
      expect(existsSync(result.baselinePath)).toBe(true);
      expect(existsSync(result.candidatePath)).toBe(true);
    });
  });
});
