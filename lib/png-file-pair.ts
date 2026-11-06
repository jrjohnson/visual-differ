import type { DecodedPng, PngDataArray } from 'fast-png';

/**
 * Represents a matched pair of PNG files loaded and ready for comparison
 */
export class PngFilePair {
  public readonly name: string;
  public readonly baselinePng: DecodedPng;
  public readonly baselineSourcePath: string;
  public readonly baselinePath: string;
  public readonly candidatePng: DecodedPng;
  public readonly candidateSourcePath: string;
  public readonly candidatePath: string;
  public readonly diffPath: string;

  get width(): number {
    // Always use baseline dimensions
    return this.baselinePng.width;
  }

  get height(): number {
    // Always use baseline dimensions
    return this.baselinePng.height;
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
      throw new Error(`${label} is a 16-bit PNG`);
    }
    return data;
  }

  /**
   * Creates a PngFilePair by loading two matched PNG files
   * @param name - The name of the matched file
   * @param baselinePng - The decoded baseline PNG
   * @param baselineSourcePath - The source path to the baseline image
   * @param baselinePath - The output path for the baseline image
   * @param candidatePng - The decoded candidate PNG
   * @param candidateSourcePath - The source path to the candidate image
   * @param candidatePath - The output path for the candidate image
   * @param diffPath - The output path for the diff image
   */
  constructor(
    name: string,
    baselinePng: DecodedPng,
    baselineSourcePath: string,
    baselinePath: string,
    candidatePng: DecodedPng,
    candidateSourcePath: string,
    candidatePath: string,
    diffPath: string,
  ) {
    this.name = name;
    this.baselinePng = baselinePng;
    this.baselineSourcePath = baselineSourcePath;
    this.baselinePath = baselinePath;
    this.candidateSourcePath = candidateSourcePath;
    this.candidatePng = candidatePng;
    this.candidatePath = candidatePath;
    this.diffPath = diffPath;
  }
}
