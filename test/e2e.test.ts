import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { TestDirectory } from './helpers/test-utils.js';
import { compareDirectories } from '../lib/visual-differ.js';

describe('End-to-End Integration', () => {
  const testDir = new TestDirectory(join(process.cwd(), 'test-fixtures-e2e'));

  beforeEach(() => {
    testDir.setup();
  });

  afterEach(() => {
    testDir.cleanup();
  });

  it('should complete full workflow with differences, additions, removals, and identical files', () => {
    // Set up test scenario with multiple file types
    // 1. Image with differences
    testDir.writeBaseline('changed.png', 'red');
    testDir.writeCandidate('changed.png', 'blue');

    // 2. Identical images
    testDir.writeBaseline('same.png', 'red');
    testDir.writeCandidate('same.png', 'red');

    // 3. Removed file (only in baseline)
    testDir.writeBaseline('removed.png', 'red');

    // 4. Added file (only in candidate)
    testDir.writeCandidate('added.png', 'blue');

    // 5. Dimension mismatch
    testDir.writeBaseline('dimension-mismatch.png', 'red'); // 1x1
    testDir.writeCandidate('dimension-mismatch.png', 'largeRed'); // 2x2

    // Run the full comparison
    const result = compareDirectories(testDir.baselineDir, testDir.candidateDir, testDir.outputDir);

    // Verify result summary
    expect(result.exitCode).toBe(1); // Should fail due to differences
    expect(result.totalImages).toBe(5);
    expect(result.withDifferences).toBe(2); // changed + dimension-mismatch
    expect(result.withoutDifferences).toBe(1); // same
    expect(result.removedFiles).toBe(1);
    expect(result.addedFiles).toBe(1);

    // Verify index.html was generated
    const htmlPath = join(testDir.outputDir, 'index.html');
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

    // Verify diff images were created in images subdirectory
    expect(existsSync(join(testDir.imagesDir, 'changed-baseline.png'))).toBe(true);
    expect(existsSync(join(testDir.imagesDir, 'changed-candidate.png'))).toBe(true);
    expect(existsSync(join(testDir.imagesDir, 'changed-diff.png'))).toBe(true);

    // Verify dimension mismatch images were created in images subdirectory
    expect(existsSync(join(testDir.imagesDir, 'dimension-mismatch-baseline.png'))).toBe(true);
    expect(existsSync(join(testDir.imagesDir, 'dimension-mismatch-candidate.png'))).toBe(true);

    // Verify no images were created for identical files
    expect(existsSync(join(testDir.imagesDir, 'same-baseline.png'))).toBe(false);
    expect(existsSync(join(testDir.imagesDir, 'same-candidate.png'))).toBe(false);
    expect(existsSync(join(testDir.imagesDir, 'same-diff.png'))).toBe(false);

    // Verify image references in HTML use images/ prefix
    expect(html).toContain('images/changed-baseline.png');
    expect(html).toContain('images/changed-diff.png');
    expect(html).toContain('images/changed-candidate.png');
    expect(html).not.toContain(testDir.outputDir); // Should not have absolute paths
  });

  it('should generate passing report when no differences exist', () => {
    // Set up scenario with only identical and new files
    testDir.writeBaseline('image1.png', 'red');
    testDir.writeCandidate('image1.png', 'red');
    testDir.writeCandidate('new-feature.png', 'blue');

    const result = compareDirectories(testDir.baselineDir, testDir.candidateDir, testDir.outputDir);

    expect(result.exitCode).toBe(0);
    expect(result.withDifferences).toBe(0);

    const html = readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');
    expect(html).toContain('PASSED');
    expect(html).toContain('✅');
  });

  it('should handle empty directories gracefully', () => {
    const result = compareDirectories(testDir.baselineDir, testDir.candidateDir, testDir.outputDir);

    expect(result.exitCode).toBe(0);
    expect(result.totalImages).toBe(0);

    const html = readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');
    expect(html).toContain('PASSED');
    expect(html).toContain('Total Images:</strong> 0');
  });

  it('should handle filenames with spaces', () => {
    testDir.writeBaseline('my test image.png', 'red');
    testDir.writeCandidate('my test image.png', 'blue');

    const result = compareDirectories(testDir.baselineDir, testDir.candidateDir, testDir.outputDir);

    expect(result.exitCode).toBe(1);
    expect(result.withDifferences).toBe(1);

    const html = readFileSync(join(testDir.outputDir, 'index.html'), 'utf-8');
    expect(html).toContain('my test image.png');

    // Verify files were created in images subdirectory
    expect(existsSync(join(testDir.imagesDir, 'my test image-baseline.png'))).toBe(true);
    expect(existsSync(join(testDir.imagesDir, 'my test image-candidate.png'))).toBe(true);
    expect(existsSync(join(testDir.imagesDir, 'my test image-diff.png'))).toBe(true);
  });
});
