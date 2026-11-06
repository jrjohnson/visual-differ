import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { TestDirectory } from './helpers/test-utils.js';
import { compareImages, type ComparisonResult } from '../lib/image-comparer.js';
import { decode } from 'fast-png';
import { PngFilePair } from '../lib/png-file-pair.js';
import { getOutputFilePaths } from '../lib/utils.js';
import { ImageComparisonError } from '../lib/errors.js';

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
      // This error is only raisable if the compared PngFilePair was instantiated directly.
      const scannedFiles = testDir.createScannedFilePair('test.png', 'red16Bit', 'red');
      const baselinePng = decode(readFileSync(scannedFiles.baseline.path));
      const candidatePng = decode(readFileSync(scannedFiles.candidate.path));
      const outputPaths = getOutputFilePaths(testDir.outputDir, 'test.png');
      const pair = new PngFilePair(
        'test.png',
        {
          text: baselinePng.text,
          width: baselinePng.width,
          height: baselinePng.height,
          data: baselinePng.data,
          channels: baselinePng.channels,
          depth: baselinePng.depth,
        },
        scannedFiles.baseline.path,
        outputPaths.baselinePath,
        {
          text: candidatePng.text,
          width: candidatePng.width,
          height: candidatePng.height,
          data: candidatePng.data,
          channels: candidatePng.channels,
          depth: candidatePng.depth,
        },
        scannedFiles.candidate.path,
        outputPaths.candidatePath,
        outputPaths.diffPath,
      );
      try {
        compareImages(pair);
      } catch (e) {
        expect(e).toBeInstanceOf(ImageComparisonError);
        if (e instanceof ImageComparisonError) {
          expect(e.message).toBe('Baseline image is a 16-bit PNG');
        }
      }
    });

    it('should return a comparisonError result when pixelmatch throws on unsupported channel count', () => {
      // greyscale is a 1x1 greyscale + alpha PNG (2-byte data). It passes the dimension and
      // bit-depth guards (same w/h/length, both 8-bit) but pixelmatch expects
      // 4-channel data, so it throws when the output buffer size disagrees.
      const scannedFiles = testDir.createScannedFilePair('test.png', 'greyscale', 'redNoAlpha');
      const baselinePng = decode(readFileSync(scannedFiles.baseline.path));
      const candidatePng = decode(readFileSync(scannedFiles.candidate.path));
      const outputPaths = getOutputFilePaths(testDir.outputDir, 'test.png');
      const pair = new PngFilePair(
        'test.png',
        {
          text: baselinePng.text,
          width: baselinePng.width,
          height: baselinePng.height,
          data: baselinePng.data,
          channels: baselinePng.channels,
          depth: baselinePng.depth,
        },
        scannedFiles.baseline.path,
        outputPaths.baselinePath,
        {
          text: candidatePng.text,
          width: candidatePng.width,
          height: candidatePng.height,
          data: candidatePng.data,
          channels: candidatePng.channels,
          depth: candidatePng.depth,
        },
        scannedFiles.candidate.path,
        outputPaths.candidatePath,
        outputPaths.diffPath,
      );

      try {
        compareImages(pair);
      } catch (e) {
        expect(e).toBeInstanceOf(ImageComparisonError);
        if (e instanceof ImageComparisonError) {
          expect(e.message).toBe('Image sizes do not match. Image 1 size: 2, image 2 size: 3');
        }
      }
    });
  });
});
