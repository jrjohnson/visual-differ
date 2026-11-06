import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { join } from 'path';
import { TestDirectory } from './helpers/test-utils.js';
import {
  DimensionMismatchError,
  UnsupportedBitDepthError,
  UnsupportedNumberOfChannelsError,
} from '../lib/errors.js';
import { PngFilePairFactory } from '../lib/png-file-pair-factory.js';

describe('PngFilePairFactory', () => {
  const testDir = new TestDirectory(join(process.cwd(), 'test-fixtures-png-pair-factory'));
  beforeEach(() => {
    testDir.setup();
  });

  afterEach(() => {
    testDir.cleanup();
  });

  it('should create a PNG file pair successfully', () => {
    const pair = testDir.createPngFilePair('image.png', 'red', 'red');

    expect(pair.name).toBe('image.png');
    expect(pair.width).toBe(1);
    expect(pair.height).toBe(1);
    expect(pair.baselinePng.data).toBeInstanceOf(Uint8Array);
    expect(pair.candidatePng.data).toBeInstanceOf(Uint8Array);
    expect(pair.baselineSourcePath).toEqual(join(testDir.baselineDir, 'image.png'));
    expect(pair.baselinePath).toEqual(join(testDir.imagesDir, 'image-baseline.png'));
    expect(pair.candidateSourcePath).toEqual(join(testDir.candidateDir, 'image.png'));
    expect(pair.candidatePath).toEqual(join(testDir.imagesDir, 'image-candidate.png'));
    expect(pair.diffPath).toEqual(join(testDir.imagesDir, 'image-diff.png'));
  });

  it('should throw on dimension mismatch', () => {
    try {
      testDir.createPngFilePair('test.png', 'red', 'largeRed');
    } catch (e) {
      expect(e).toBeInstanceOf(DimensionMismatchError);
      if (e instanceof DimensionMismatchError) {
        expect(e.dimensionMismatch).toEqual({
          baselineWidth: 1,
          baselineHeight: 1,
          baselineLength: 4,
          candidateWidth: 2,
          candidateHeight: 2,
          candidateLength: 16,
        });
      }
    }
  });

  it('should throw error on unsupported channel count', () => {
    try {
      testDir.createPngFilePair('test.png', 'greyscale', 'greyscale');
    } catch (e) {
      expect(e).toBeInstanceOf(UnsupportedNumberOfChannelsError);
      if (e instanceof UnsupportedNumberOfChannelsError) {
        expect(e.unsupportedNumberOfChannels).toEqual({
          baselineNumberOfChannels: 2,
          candidateNumberOfChannels: 2,
        });
      }
    }
  });

  it('should throw error on unsupported bit depth', () => {
    try {
      testDir.createPngFilePair('test.png', 'red16Bit', 'red');
    } catch (e) {
      expect(e).toBeInstanceOf(UnsupportedBitDepthError);
      if (e instanceof UnsupportedBitDepthError) {
        expect(e.unsupportedBitDepth).toEqual({
          baselineDepth: 16,
          candidateDepth: 8,
        });
      }
    }
  });

  it('should throw error if baseline file cannot be read', () => {
    // Create a file so candidate exists
    const scannedFiles = testDir.createScannedFilePair('exists.png', 'red', 'red');
    scannedFiles.baseline.path = join(testDir.baselineDir, 'missing.png');

    expect(() =>
      PngFilePairFactory.create(
        'test.png',
        scannedFiles.baseline,
        scannedFiles.candidate,
        testDir.outputDir,
      ),
    ).toThrow();
  });

  it('should throw error if candidate file cannot be read', () => {
    // Create a file so candidate exists
    const scannedFiles = testDir.createScannedFilePair('exists.png', 'red', 'red');
    scannedFiles.baseline.path = join(testDir.candidateDir, 'missing.png');

    expect(() =>
      PngFilePairFactory.create(
        'test.png',
        scannedFiles.baseline,
        scannedFiles.candidate,
        testDir.outputDir,
      ),
    ).toThrow();
  });
});
