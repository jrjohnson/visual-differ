import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PngFilePair } from '../../lib/png-file-pair.js';

/**
 * PNG test fixtures - minimal valid PNG images
 */

/** Valid 1x1 red PNG */
const RED_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64',
);

/** Valid 1x1 blue PNG */
const BLUE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
  'base64',
);

/** Valid 2x2 red PNG */
const LARGE_RED_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAE0lEQVR4AWP8z8DwnwEImBigAAAfFwICgH3ifwAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Available PNG fixtures for testing
 */
export type PngFixture = 'red' | 'blue' | 'largeRed';

/**
 * Gets the PNG buffer for a given fixture
 */
function getPngBuffer(fixture: PngFixture): Buffer {
  switch (fixture) {
    case 'red':
      return RED_PNG;
    case 'blue':
      return BLUE_PNG;
    case 'largeRed':
      return LARGE_RED_PNG;
  }
}

/**
 * Creates and manages a temporary test directory structure
 * Automatically sets up baseline/, candidate/, and output/ subdirectories
 */
export class TestDirectory {
  public readonly baselineDir: string;
  public readonly candidateDir: string;
  public readonly outputDir: string;
  public readonly imagesDir: string;

  constructor(public readonly root: string) {
    this.baselineDir = join(root, 'baseline');
    this.candidateDir = join(root, 'candidate');
    this.outputDir = join(root, 'output');
    this.imagesDir = join(root, 'output', 'images');
  }

  /**
   * Sets up the test directory structure with baseline, candidate, output, and output/images dirs
   * Call this in beforeEach
   */
  setup(): void {
    rmSync(this.root, { recursive: true, force: true });
    mkdirSync(this.baselineDir, { recursive: true });
    mkdirSync(this.candidateDir, { recursive: true });
    mkdirSync(this.imagesDir, { recursive: true });
  }

  /**
   * Cleans up the test directory
   * Call this in afterEach
   */
  cleanup(): void {
    rmSync(this.root, { recursive: true, force: true });
  }

  /**
   * Creates a real PngFilePair by writing actual PNG files to baseline and candidate dirs
   *
   * @param name - The name of the PNG file (e.g., 'test.png')
   * @param baselineFixture - Which PNG fixture to use for baseline
   * @param candidateFixture - Which PNG fixture to use for candidate
   * @returns A real PngFilePair loaded from the written files
   *
   * @example
   * const pair = testDir.createPngFilePair('test.png', 'red', 'blue');
   */
  createPngFilePair(
    name: string,
    baselineFixture: PngFixture,
    candidateFixture: PngFixture,
  ): PngFilePair {
    const baselinePath = join(this.baselineDir, name);
    const candidatePath = join(this.candidateDir, name);

    writeFileSync(baselinePath, getPngBuffer(baselineFixture));
    writeFileSync(candidatePath, getPngBuffer(candidateFixture));

    return new PngFilePair(
      name,
      { name, path: baselinePath },
      { name, path: candidatePath },
      this.imagesDir,
    );
  }

  /**
   * Writes a PNG file to the baseline directory
   *
   * @example
   * testDir.writeBaseline('image.png', 'red');
   */
  writeBaseline(name: string, fixture: PngFixture): void {
    writeFileSync(join(this.baselineDir, name), getPngBuffer(fixture));
  }

  /**
   * Writes a PNG file to the candidate directory
   *
   * @example
   * testDir.writeCandidate('image.png', 'blue');
   */
  writeCandidate(name: string, fixture: PngFixture): void {
    writeFileSync(join(this.candidateDir, name), getPngBuffer(fixture));
  }
}
