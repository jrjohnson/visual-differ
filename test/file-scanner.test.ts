import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { scanAndMatchFiles, type FileMatchResult } from '../lib/file-scanner.js';

describe('file-scanner', () => {
  const testDir = join(process.cwd(), 'test-fixtures');
  const baselineDir = join(testDir, 'baseline');
  const candidateDir = join(testDir, 'candidate');

  beforeEach(() => {
    // Clean up and create fresh test directories
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(baselineDir, { recursive: true });
    mkdirSync(candidateDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('scanAndMatchFiles', () => {
    it('should find matching PNG files in both directories', () => {
      writeFileSync(join(baselineDir, 'image1.png'), 'baseline1');
      writeFileSync(join(baselineDir, 'image2.png'), 'baseline2');
      writeFileSync(join(candidateDir, 'image1.png'), 'candidate1');
      writeFileSync(join(candidateDir, 'image2.png'), 'candidate2');

      const result: FileMatchResult = scanAndMatchFiles(baselineDir, candidateDir);

      expect(result.matched).toHaveLength(2);
      expect(result.matched[0]?.name).toBe('image1.png');
      expect(result.matched[1]?.name).toBe('image2.png');
      expect(result.baselineOnly).toHaveLength(0);
      expect(result.candidateOnly).toHaveLength(0);
    });

    it('should identify files only in baseline directory', () => {
      writeFileSync(join(baselineDir, 'old-image.png'), 'old');
      writeFileSync(join(baselineDir, 'common.png'), 'common');
      writeFileSync(join(candidateDir, 'common.png'), 'common');

      const result: FileMatchResult = scanAndMatchFiles(baselineDir, candidateDir);

      expect(result.matched).toHaveLength(1);
      expect(result.matched[0]?.name).toBe('common.png');
      expect(result.baselineOnly).toHaveLength(1);
      expect(result.baselineOnly[0]?.name).toBe('old-image.png');
      expect(result.candidateOnly).toHaveLength(0);
    });

    it('should identify files only in candidate directory', () => {
      writeFileSync(join(baselineDir, 'common.png'), 'common');
      writeFileSync(join(candidateDir, 'common.png'), 'common');
      writeFileSync(join(candidateDir, 'new-image.png'), 'new');

      const result: FileMatchResult = scanAndMatchFiles(baselineDir, candidateDir);

      expect(result.matched).toHaveLength(1);
      expect(result.candidateOnly).toHaveLength(1);
      expect(result.candidateOnly[0]?.name).toBe('new-image.png');
      expect(result.baselineOnly).toHaveLength(0);
    });

    it('should ignore non-PNG files', () => {
      writeFileSync(join(baselineDir, 'image.png'), 'png');
      writeFileSync(join(baselineDir, 'readme.txt'), 'text');
      writeFileSync(join(baselineDir, 'image.jpg'), 'jpg');
      writeFileSync(join(candidateDir, 'image.png'), 'png');

      const result: FileMatchResult = scanAndMatchFiles(baselineDir, candidateDir);

      expect(result.matched).toHaveLength(1);
      expect(result.matched[0]?.name).toBe('image.png');
      expect(result.baselineOnly).toHaveLength(0);
      expect(result.candidateOnly).toHaveLength(0);
    });

    it('should handle empty directories', () => {
      const result: FileMatchResult = scanAndMatchFiles(baselineDir, candidateDir);

      expect(result.matched).toHaveLength(0);
      expect(result.baselineOnly).toHaveLength(0);
      expect(result.candidateOnly).toHaveLength(0);
    });

    it('should return sorted results', () => {
      writeFileSync(join(baselineDir, 'zebra.png'), 'z');
      writeFileSync(join(baselineDir, 'alpha.png'), 'a');
      writeFileSync(join(baselineDir, 'beta.png'), 'b');
      writeFileSync(join(candidateDir, 'zebra.png'), 'z');
      writeFileSync(join(candidateDir, 'alpha.png'), 'a');
      writeFileSync(join(candidateDir, 'beta.png'), 'b');

      const result: FileMatchResult = scanAndMatchFiles(baselineDir, candidateDir);

      expect(result.matched[0]?.name).toBe('alpha.png');
      expect(result.matched[1]?.name).toBe('beta.png');
      expect(result.matched[2]?.name).toBe('zebra.png');
    });

    it('should throw error if baseline directory does not exist', () => {
      const nonExistent = join(testDir, 'does-not-exist');

      expect(() => scanAndMatchFiles(nonExistent, candidateDir)).toThrow();
    });

    it('should throw error if candidate directory does not exist', () => {
      const nonExistent = join(testDir, 'does-not-exist');

      expect(() => scanAndMatchFiles(baselineDir, nonExistent)).toThrow();
    });
  });
});
