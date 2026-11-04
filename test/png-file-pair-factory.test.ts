import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PngFilePairFactory } from '../lib/png-file-pair-factory.js';
import { TestDirectory } from './helpers/test-utils';
import { join } from 'path';

describe('PngFilePairFactory', () => {
  const testDir = new TestDirectory(join(process.cwd(), 'test-fixtures-png-pair-factory'));
  beforeEach(() => {
    testDir.setup();
  });

  afterEach(() => {
    testDir.cleanup();
  });

  it('should create a new PngFilePair', () => {
    const name = 'image.png';
    const scannedFilePair = testDir.createScannedFilePair(name, 'red', 'red');
    const pngFilePair = PngFilePairFactory.create(
      name,
      scannedFilePair.baseline,
      scannedFilePair.candidate,
      testDir.imagesDir,
    );
    expect(pngFilePair.name).toBe(name);
    expect(pngFilePair.width).toBe(1);
    expect(pngFilePair.height).toBe(1);
    expect(pngFilePair.baselinePng.data).toBeInstanceOf(Uint8Array);
    expect(pngFilePair.candidatePng.data).toBeInstanceOf(Uint8Array);
  });
});
