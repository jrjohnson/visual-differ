import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { TestDirectory } from './helpers/test-utils.js';
import { PngFilePair } from '../lib/png-file-pair.js';

describe('PngFilePair', () => {
  const testDir = new TestDirectory(join(process.cwd(), 'test-fixtures-png-pair'));

  beforeEach(() => {
    testDir.setup();
  });

  afterEach(() => {
    testDir.cleanup();
  });

  it('should load matched PNG files successfully', () => {
    const pair = testDir.createPngFilePair('image.png', 'red', 'red');

    expect(pair.name).toBe('image.png');
    expect(pair.width).toBe(1);
    expect(pair.height).toBe(1);
    expect(pair.baselinePng.data).toBeInstanceOf(Uint8Array);
    expect(pair.candidatePng.data).toBeInstanceOf(Uint8Array);
    expect(pair.hasDimensionMismatch).toBe(false);
  });

  it('should detect dimension mismatch without throwing', () => {
    const pair = testDir.createPngFilePair('test.png', 'red', 'largeRed');

    expect(pair.hasDimensionMismatch).toBe(true);
    expect(pair.dimensionMismatch).toEqual({
      baselineWidth: 1,
      baselineHeight: 1,
      candidateWidth: 2,
      candidateHeight: 2,
    });
  });

  it('should throw error if baseline file cannot be read', () => {
    // Create a file so candidate exists
    testDir.createPngFilePair('exists.png', 'red', 'red');
    const missingPath = join(testDir.baselineDir, 'missing.png');

    expect(
      () =>
        new PngFilePair(
          'test.png',
          { name: 'test.png', path: missingPath },
          { name: 'exists.png', path: join(testDir.candidateDir, 'exists.png') },
          testDir.outputDir,
        ),
    ).toThrow();
  });

  it('should throw error if candidate file cannot be read', () => {
    // Create a file so baseline exists
    testDir.createPngFilePair('exists.png', 'red', 'red');
    const missingPath = join(testDir.candidateDir, 'missing.png');

    expect(
      () =>
        new PngFilePair(
          'test.png',
          { name: 'exists.png', path: join(testDir.baselineDir, 'exists.png') },
          { name: 'test.png', path: missingPath },
          testDir.outputDir,
        ),
    ).toThrow();
  });
});
