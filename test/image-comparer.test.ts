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

      expect(result.pair.name).toBe('image.png');
      expect(result.hasDifference).toBe(false);
      expect(result.diffPercentage).toBe(0);
      // Images should not be written for identical results
      expect(existsSync(result.pair.diffPath)).toBe(false);
    });

    it('should detect different images', () => {
      const pair = testDir.createPngFilePair('test.png', 'red', 'blue');

      const result: ComparisonResult = compareImages(pair);

      expect(result.pair.name).toBe('test.png');
      expect(result.hasDifference).toBe(true);
      expect(result.diffPercentage).toBeGreaterThan(0);
      expect(existsSync(result.pair.diffPath)).toBe(true);
      expect(existsSync(result.pair.baselinePath)).toBe(true);
      expect(existsSync(result.pair.candidatePath)).toBe(true);
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

      expect(result.pair.name).toBe('test.png');
      expect(result.hasDifference).toBe(true);
      expect(result.diffPercentage).toBe(100);
    });

    it('should ignore all differences with threshold=1', () => {
      const pair = testDir.createPngFilePair('test.png', 'red', 'blue');

      const result: ComparisonResult = compareImages(pair, 1);

      expect(result.pair.name).toBe('test.png');
      expect(result.hasDifference).toBe(false);
      expect(result.diffPercentage).toBe(0);
      // Images should not be written when no differences detected
      expect(existsSync(result.pair.diffPath)).toBe(false);
    });
  });
});
