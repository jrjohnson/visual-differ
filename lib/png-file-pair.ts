import { decode } from 'fast-png';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BASELINE_SUFFIX, CANDIDATE_SUFFIX, DIFF_SUFFIX } from './constants.js';
import type { ScannedFile } from './file-scanner.js';
import type { BitDepth, DecodedPng, PngDataArray } from 'fast-png';

/**
 * Information about a dimension mismatch between baseline and candidate images
 */
export interface DimensionMismatch {
  baselineWidth: number;
  baselineHeight: number;
  candidateWidth: number;
  candidateHeight: number;
}

/**
 * Information about a baseline/candidate pair where either PNG uses a bit
 * depth pixelmatch cannot compare (pixelmatch only supports 8-bit-per-channel
 * data; 16-bit PNGs decode to a Uint16Array of raw sample values)
 */
export interface UnsupportedBitDepth {
  baselineDepth: BitDepth;
  candidateDepth: BitDepth;
}

/**
 * Represents a matched pair of PNG files loaded and ready for comparison
 */
export class PngFilePair {
  public readonly name: string;
  public readonly outputDir: string;
  public readonly baselineSourcePath: string;
  public readonly candidateSourcePath: string;
  public readonly width: number;
  public readonly height: number;
  public readonly dimensionMismatch?: DimensionMismatch;
  public readonly unsupportedBitDepth?: UnsupportedBitDepth;

  get baselinePng(): DecodedPng {
    return decode(readFileSync(this.baselineSourcePath));
  }

  get candidatePng(): DecodedPng {
    return decode(readFileSync(this.candidateSourcePath));
  }

  /**
   * Returns true if the baseline and candidate images have different dimensions
   */
  get hasDimensionMismatch(): boolean {
    return this.dimensionMismatch !== undefined;
  }

  /**
   * Returns true if the baseline or candidate PNG uses a bit depth pixelmatch cannot compare
   */
  get hasUnsupportedBitDepth(): boolean {
    return this.unsupportedBitDepth !== undefined;
  }

  /**
   * Gets the baseline PNG's pixel data as 8-bit samples, as required by pixelmatch
   */
  get baselineEightBitData(): Uint8Array | Uint8ClampedArray {
    return this.toEightBitData(this.baselinePng.data, 'Baseline image');
  }

  /**
   * Gets the candidate PNG's pixel data as 8-bit samples, as required by pixelmatch
   */
  get candidateEightBitData(): Uint8Array | Uint8ClampedArray {
    return this.toEightBitData(this.candidatePng.data, 'Candidate image');
  }

  /**
   * Narrows fast-png's decoded data to the 8-bit arrays pixelmatch accepts.
   * Callers should check `hasUnsupportedBitDepth` first; this throws if that
   * check was skipped, since 16-bit sample values aren't byte-compatible with
   * pixelmatch's RGBA assumptions.
   */
  private toEightBitData(data: PngDataArray, label: string): Uint8Array | Uint8ClampedArray {
    if (data instanceof Uint16Array) {
      throw new Error(`${label} is a 16-bit PNG; check hasUnsupportedBitDepth before comparing`);
    }
    return data;
  }

  /**
   * Gets the base name without extension
   */
  private get nameWithoutExtension(): string {
    return this.name.replace(/\.png$/i, '');
  }

  /**
   * Gets the output path for the baseline image
   */
  get baselinePath(): string {
    return join(this.outputDir, `${this.nameWithoutExtension}${BASELINE_SUFFIX}`);
  }

  /**
   * Gets the output path for the candidate image
   */
  get candidatePath(): string {
    return join(this.outputDir, `${this.nameWithoutExtension}${CANDIDATE_SUFFIX}`);
  }

  /**
   * Gets the output path for the diff image
   */
  get diffPath(): string {
    return join(this.outputDir, `${this.nameWithoutExtension}${DIFF_SUFFIX}`);
  }

  /**
   * Creates a PngFilePair by loading two matched PNG files
   * @param name - The name of the matched file
   * @param baseline - The baseline file info
   * @param candidate - The candidate file info
   * @param outputDir - The output directory for generated images
   */
  constructor(name: string, baseline: ScannedFile, candidate: ScannedFile, outputDir: string) {
    this.name = name;
    this.outputDir = outputDir;
    this.baselineSourcePath = baseline.path;
    this.candidateSourcePath = candidate.path;

    // Read PNGs
    const { width: baselineWidth, height: baselineHeight, depth: baselineDepth } = this.baselinePng;
    const {
      width: candidateWidth,
      height: candidateHeight,
      depth: candidateDepth,
    } = this.candidatePng;

    // Always use baseline dimensions
    this.width = baselineWidth;
    this.height = baselineHeight;

    // Check for dimension mismatch
    if (baselineWidth !== candidateWidth || baselineHeight !== candidateHeight) {
      this.dimensionMismatch = {
        baselineWidth: baselineWidth,
        baselineHeight: baselineHeight,
        candidateWidth: candidateWidth,
        candidateHeight: candidateHeight,
      };
    }

    // Check for an unsupported bit depth
    if (baselineDepth === 16 || candidateDepth === 16) {
      this.unsupportedBitDepth = { baselineDepth, candidateDepth };
    }
  }
}
