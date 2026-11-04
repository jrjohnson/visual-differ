import { decode, type DecodedPng } from 'fast-png';
import { readFileSync } from 'fs';
import { PngFilePair } from './png-file-pair.js';
import type { ScannedFile } from './file-scanner.js';
import { getOutputFilePaths } from './utils.js';
import {
  DimensionMismatchError,
  UnsupportedBitDepthError,
  UnsupportedNumberOfChannelsError,
} from './errors.js';

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
    // Input file paths
    const baselineSourcePath = baseline.path;
    const candidateSourcePath = candidate.path;

    // Target output file paths
    const { baselinePath, candidatePath, diffPath } = getOutputFilePaths(outputDir, name);
    // Decode the files
    const baselinePng = PngFilePairFactory.#decode(readFileSync(baselineSourcePath));
    const candidatePng = PngFilePairFactory.#decode(readFileSync(candidateSourcePath));

    // Read attributes and data from files
    const {
      width: baselineWidth,
      height: baselineHeight,
      depth: baselineDepth,
      data: baselineData,
      channels: baselineNumberOfChannels,
    } = baselinePng;
    const {
      width: candidateWidth,
      height: candidateHeight,
      depth: candidateDepth,
      data: candidateData,
      channels: candidateNumberOfChannels,
    } = candidatePng;
    const { length: baselineLength } = baselineData;
    const { length: candidateLength } = candidateData;

    // Check for dimension mismatch
    if (
      baselineWidth !== candidateWidth ||
      baselineHeight !== candidateHeight ||
      baselineLength !== candidateLength
    ) {
      throw new DimensionMismatchError(
        baselineSourcePath,
        baselinePath,
        candidateSourcePath,
        candidatePath,
        diffPath,
        {
          baselineWidth,
          baselineHeight,
          baselineLength,
          candidateWidth,
          candidateHeight,
          candidateLength,
        },
      );
    }

    // Check for an unsupported bit depth
    if (baselineDepth === 16 || candidateDepth === 16) {
      throw new UnsupportedBitDepthError(
        baselineSourcePath,
        baselinePath,
        candidateSourcePath,
        candidatePath,
        diffPath,
        { baselineDepth, candidateDepth },
      );
    }

    // Check for unsupported channels count.
    if (4 !== baselineNumberOfChannels || 4 !== candidateNumberOfChannels) {
      throw new UnsupportedNumberOfChannelsError(
        baselineSourcePath,
        baselinePath,
        candidateSourcePath,
        candidatePath,
        diffPath,
        { baselineNumberOfChannels, candidateNumberOfChannels },
      );
    }

    return new PngFilePair(
      name,
      baselinePng,
      baselineSourcePath,
      baselinePath,
      candidatePng,
      candidateSourcePath,
      candidatePath,
      diffPath,
    );
  }

  /**
   * Decodes the given image.
   * RGB images are automatically converted to RGBA images in the process.
   */
  static #decode(png: Buffer): DecodedPng {
    const image = decode(png);

    // Return any non 3-channels/RBG PNGs as-is.
    if (image.channels !== 3) {
      return image;
    }

    // Convert the RGB image into a 4-channels/RGBA variant.
    const rgba = new Uint8Array((image.data.length / 3) * 4);
    for (let src = 0, dst = 0; src < image.data.length; src += 3, dst += 4) {
      rgba[dst] = image.data[src]!;
      rgba[dst + 1] = image.data[src + 1]!;
      rgba[dst + 2] = image.data[src + 2]!;
      rgba[dst + 3] = 255;
    }
    return {
      text: image.text,
      width: image.width,
      height: image.height,
      data: rgba,
      channels: 4,
      depth: image.depth,
    };
  }
}
