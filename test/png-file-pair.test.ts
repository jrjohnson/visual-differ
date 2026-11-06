import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { TestDirectory } from './helpers/test-utils.js';
import { PngFilePair } from '../lib/png-file-pair.js';
import { readFileSync } from 'fs';
import { decode } from 'fast-png';
import { getOutputFilePaths } from '../lib/utils.js';

describe('PngFilePair', () => {
  const testDir = new TestDirectory(join(process.cwd(), 'test-fixtures-png-pair'));

  beforeEach(() => {
    testDir.setup();
  });

  afterEach(() => {
    testDir.cleanup();
  });

  it('should throw error when reading 8-bit data from a 16-bit baseline image', () => {
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
    expect(() => pair.baselineEightBitData).toThrow('Baseline image is a 16-bit PNG');
  });

  it('should throw error when reading 8-bit data from a 16-bit candidate image', () => {
    const scannedFiles = testDir.createScannedFilePair('test.png', 'red', 'red16Bit');
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
    expect(() => pair.candidateEightBitData).toThrow('Candidate image is a 16-bit PNG');
  });

  it('should return 8-bit sample data when both images are 8-bit', () => {
    const pair = testDir.createPngFilePair('test.png', 'red', 'blue');

    expect(pair.baselineEightBitData).toBeInstanceOf(Uint8Array);
    expect(pair.candidateEightBitData).toBeInstanceOf(Uint8Array);
  });
});
