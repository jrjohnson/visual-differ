import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { compareDirectories } from '../lib/visual-differ.js';
import { RED_PNG, BLUE_PNG, LARGE_RED_PNG } from './fixtures/png-fixtures.js';

describe('End-to-End Integration', () => {
  const testDir = join(process.cwd(), 'test-fixtures-e2e');
  const baselineDir = join(testDir, 'baseline');
  const candidateDir = join(testDir, 'candidate');
  const outputDir = join(testDir, 'output');

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(baselineDir, { recursive: true });
    mkdirSync(candidateDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should complete full workflow with differences, additions, removals, and identical files', () => {
    // Set up test scenario with multiple file types
    // 1. Image with differences
    writeFileSync(join(baselineDir, 'changed.png'), RED_PNG);
    writeFileSync(join(candidateDir, 'changed.png'), BLUE_PNG);

    // 2. Identical images
    writeFileSync(join(baselineDir, 'same.png'), RED_PNG);
    writeFileSync(join(candidateDir, 'same.png'), RED_PNG);

    // 3. Removed file (only in baseline)
    writeFileSync(join(baselineDir, 'removed.png'), RED_PNG);

    // 4. Added file (only in candidate)
    writeFileSync(join(candidateDir, 'added.png'), BLUE_PNG);

    // 5. Dimension mismatch
    writeFileSync(join(baselineDir, 'dimension-mismatch.png'), RED_PNG); // 1x1
    writeFileSync(join(candidateDir, 'dimension-mismatch.png'), LARGE_RED_PNG); // 2x2

    // Run the full comparison
    const result = compareDirectories(baselineDir, candidateDir, outputDir);

    // Verify result summary
    expect(result.exitCode).toBe(1); // Should fail due to differences
    expect(result.totalImages).toBe(5);
    expect(result.withDifferences).toBe(2); // changed + dimension-mismatch
    expect(result.withoutDifferences).toBe(1); // same
    expect(result.removedFiles).toBe(1);
    expect(result.addedFiles).toBe(1);

    // Verify index.html was generated
    const htmlPath = join(outputDir, 'index.html');
    expect(existsSync(htmlPath)).toBe(true);

    // Verify HTML content
    const html = readFileSync(htmlPath, 'utf-8');

    // Check structure
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Visual Diff Report');

    // Check status
    expect(html).toContain('FAILED');
    expect(html).toContain('❌');

    // Check summary counts
    expect(html).toContain('Total Images:</strong> 5');
    expect(html).toContain('Different:</strong> 2');
    expect(html).toContain('Removed:</strong> 1');
    expect(html).toContain('Added:</strong> 1');
    expect(html).toContain('Identical:</strong> 1');

    // Check differences section mentions the changed files
    expect(html).toContain('changed.png');
    expect(html).toContain('dimension-mismatch.png');

    // Check dimension mismatch is called out
    expect(html).toContain('Dimension mismatch');
    expect(html).toContain('1x1');
    expect(html).toContain('2x2');

    // Check missing/new files section
    expect(html).toContain('removed.png');
    expect(html).toContain('added.png');

    // Check identical section
    expect(html).toContain('same.png');

    // Check CSS is present
    expect(html).toContain('.diff-images');
    expect(html).toContain('max-width: 30vw');

    // Verify diff images were created for files with differences
    expect(existsSync(join(outputDir, 'changed-baseline.png'))).toBe(true);
    expect(existsSync(join(outputDir, 'changed-candidate.png'))).toBe(true);
    expect(existsSync(join(outputDir, 'changed-diff.png'))).toBe(true);

    // Verify dimension mismatch images were created
    expect(existsSync(join(outputDir, 'dimension-mismatch-baseline.png'))).toBe(true);
    expect(existsSync(join(outputDir, 'dimension-mismatch-candidate.png'))).toBe(true);

    // Verify no images were created for identical files
    expect(existsSync(join(outputDir, 'same-baseline.png'))).toBe(false);
    expect(existsSync(join(outputDir, 'same-candidate.png'))).toBe(false);
    expect(existsSync(join(outputDir, 'same-diff.png'))).toBe(false);

    // Verify image references in HTML use basename only
    expect(html).toContain('changed-baseline.png');
    expect(html).toContain('changed-diff.png');
    expect(html).toContain('changed-candidate.png');
    expect(html).not.toContain(outputDir); // Should not have absolute paths
  });

  it('should generate passing report when no differences exist', () => {
    // Set up scenario with only identical and new files
    writeFileSync(join(baselineDir, 'image1.png'), RED_PNG);
    writeFileSync(join(candidateDir, 'image1.png'), RED_PNG);
    writeFileSync(join(candidateDir, 'new-feature.png'), BLUE_PNG);

    const result = compareDirectories(baselineDir, candidateDir, outputDir);

    expect(result.exitCode).toBe(0);
    expect(result.withDifferences).toBe(0);

    const html = readFileSync(join(outputDir, 'index.html'), 'utf-8');
    expect(html).toContain('PASSED');
    expect(html).toContain('✅');
  });

  it('should handle empty directories gracefully', () => {
    const result = compareDirectories(baselineDir, candidateDir, outputDir);

    expect(result.exitCode).toBe(0);
    expect(result.totalImages).toBe(0);

    const html = readFileSync(join(outputDir, 'index.html'), 'utf-8');
    expect(html).toContain('PASSED');
    expect(html).toContain('Total Images:</strong> 0');
  });

  it('should handle filenames with spaces', () => {
    writeFileSync(join(baselineDir, 'my test image.png'), RED_PNG);
    writeFileSync(join(candidateDir, 'my test image.png'), BLUE_PNG);

    const result = compareDirectories(baselineDir, candidateDir, outputDir);

    expect(result.exitCode).toBe(1);
    expect(result.withDifferences).toBe(1);

    const html = readFileSync(join(outputDir, 'index.html'), 'utf-8');
    expect(html).toContain('my test image.png');

    // Verify files were created
    expect(existsSync(join(outputDir, 'my test image-baseline.png'))).toBe(true);
    expect(existsSync(join(outputDir, 'my test image-candidate.png'))).toBe(true);
    expect(existsSync(join(outputDir, 'my test image-diff.png'))).toBe(true);
  });
});
