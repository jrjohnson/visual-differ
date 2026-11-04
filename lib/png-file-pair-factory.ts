import { PngFilePair } from './png-file-pair.js';
import type { ScannedFile } from './file-scanner';

/**
 * Factory for creating PNG file pairs.
 * Use this instead of directly instantiating `PngFilePair` objects.
 */
export class PngFilePairFactory {
  public static create(
    name: string,
    baseline: ScannedFile,
    candidate: ScannedFile,
    outputDir: string,
  ): PngFilePair {
    return new PngFilePair(name, baseline, candidate, outputDir);
  }
}
