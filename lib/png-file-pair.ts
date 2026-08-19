import { decode } from 'fast-png';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BASELINE_SUFFIX, CANDIDATE_SUFFIX, DIFF_SUFFIX } from './constants.js';
import type { ScannedFile } from './file-scanner.js';
import type { DecodedPng } from 'fast-png';
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
    const { width: baselineWidth, height: baselineHeight } = this.baselinePng;
    const { width: candidateWidth, height: candidateHeight } = this.candidatePng;

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
  }
}
