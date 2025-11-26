import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { PngFilePair } from '../lib/png-file-pair.js';
import { compareImages, type ComparisonResult } from '../lib/image-comparer.js';
import { RED_PNG, BLUE_PNG } from './fixtures/png-fixtures.js';

describe('image-comparer', () => {
  const testDir = join(process.cwd(), 'test-fixtures-comparer');
  const outputDir = join(testDir, 'output');

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('compareImages', () => {
    it('should detect identical images', () => {
      const baselinePath = join(testDir, 'image.png');
      const candidatePath = join(testDir, 'image2.png');

      writeFileSync(baselinePath, RED_PNG);
      writeFileSync(candidatePath, RED_PNG);

      const pair = new PngFilePair(
        'image.png',
        { name: 'image.png', path: baselinePath },
        { name: 'image.png', path: candidatePath },
        outputDir,
      );

      const result: ComparisonResult = compareImages(pair);

      expect(result.pair.name).toBe('image.png');
      expect(result.hasDifference).toBe(false);
      expect(result.diffPercentage).toBe(0);
      // Images should not be written for identical results
      expect(existsSync(result.pair.diffPath)).toBe(false);
    });

    it('should detect different images', () => {
      const baselinePath = join(testDir, 'red.png');
      const candidatePath = join(testDir, 'blue.png');

      writeFileSync(baselinePath, RED_PNG);
      writeFileSync(candidatePath, BLUE_PNG);

      const pair = new PngFilePair(
        'test.png',
        { name: 'test.png', path: baselinePath },
        { name: 'test.png', path: candidatePath },
        outputDir,
      );

      const result: ComparisonResult = compareImages(pair);

      expect(result.pair.name).toBe('test.png');
      expect(result.hasDifference).toBe(true);
      expect(result.diffPercentage).toBeGreaterThan(0);
      expect(existsSync(result.pair.diffPath)).toBe(true);
      expect(existsSync(result.pair.baselinePath)).toBe(true);
      expect(existsSync(result.pair.candidatePath)).toBe(true);
    });

    it('should calculate correct diff percentage', () => {
      const baselinePath = join(testDir, 'red.png');
      const candidatePath = join(testDir, 'blue.png');

      writeFileSync(baselinePath, RED_PNG);
      writeFileSync(candidatePath, BLUE_PNG);

      const pair = new PngFilePair(
        'test.png',
        { name: 'test.png', path: baselinePath },
        { name: 'test.png', path: candidatePath },
        outputDir,
      );

      const result: ComparisonResult = compareImages(pair);

      // For 1x1 image with one different pixel, it should be 100%
      expect(result.diffPercentage).toBe(100);
    });
  });
});
