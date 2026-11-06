import { type BitDepth } from 'fast-png';

/**
 * Information about a dimension mismatch between baseline and candidate images
 */
export interface DimensionMismatch {
  baselineWidth: number;
  baselineHeight: number;
  baselineLength: number;
  candidateWidth: number;
  candidateHeight: number;
  candidateLength: number;
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
 * Information about a baseline/candidate pair where either one or both PNGs
 * do not use 4 channels (RBGA). Pixelmatch expects all input data to have exactly four channels.
 */
export interface UnsupportedNumberOfChannels {
  baselineNumberOfChannels: number;
  candidateNumberOfChannels: number;
}

/**
 * Base class for capturing errors during file pair comparison.
 */
export abstract class FilePairComparisonError extends Error {
  public readonly baselineSourcePath: string;
  public readonly baselinePath: string;
  public readonly candidateSourcePath: string;
  public readonly candidatePath: string;
  public readonly diffPath: string;

  protected constructor(
    message: string,
    baselineSourcePath: string,
    baselinePath: string,
    candidateSourcePath: string,
    candidatePath: string,
    diffPath: string,
  ) {
    super(message);
    this.baselineSourcePath = baselineSourcePath;
    this.baselinePath = baselinePath;
    this.candidateSourcePath = candidateSourcePath;
    this.candidatePath = candidatePath;
    this.diffPath = diffPath;
  }
}

/** Error for capturing dimension mismatches between file pairs. */
export class DimensionMismatchError extends FilePairComparisonError {
  public readonly dimensionMismatch: DimensionMismatch;

  constructor(
    baselineSourcePath: string,
    baselinePath: string,
    candidateSourcePath: string,
    candidatePath: string,
    diffPath: string,
    dimensionMismatch: DimensionMismatch,
  ) {
    super(
      'Dimension mismatch',
      baselineSourcePath,
      baselinePath,
      candidateSourcePath,
      candidatePath,
      diffPath,
    );
    this.dimensionMismatch = dimensionMismatch;
  }
}

/** Error for capturing unsupported bit depths in file pairs. */
export class UnsupportedBitDepthError extends FilePairComparisonError {
  public readonly unsupportedBitDepth: UnsupportedBitDepth;

  constructor(
    baselineSourcePath: string,
    baselinePath: string,
    candidateSourcePath: string,
    candidatePath: string,
    diffPath: string,
    unsupportedBitDepth: UnsupportedBitDepth,
  ) {
    super(
      'Unsupported bit depth',
      baselineSourcePath,
      baselinePath,
      candidateSourcePath,
      candidatePath,
      diffPath,
    );
    this.unsupportedBitDepth = unsupportedBitDepth;
  }
}

/** Error for capturing unsupported number of color channels depths in file pairs. */
export class UnsupportedNumberOfChannelsError extends FilePairComparisonError {
  public readonly unsupportedNumberOfChannels: UnsupportedNumberOfChannels;

  constructor(
    baselineSourcePath: string,
    baselinePath: string,
    candidateSourcePath: string,
    candidatePath: string,
    diffPath: string,
    unsupportedNumberOfChannels: UnsupportedNumberOfChannels,
  ) {
    super(
      'Unsupported number of channels',
      baselineSourcePath,
      baselinePath,
      candidateSourcePath,
      candidatePath,
      diffPath,
    );
    this.unsupportedNumberOfChannels = unsupportedNumberOfChannels;
  }
}
/** Error for capturing any generic image comparison error */
export class ImageComparisonError extends FilePairComparisonError {
  constructor(
    message: string,
    baselineSourcePath: string,
    baselinePath: string,
    candidateSourcePath: string,
    candidatePath: string,
    diffPath: string,
  ) {
    super(message, baselineSourcePath, baselinePath, candidateSourcePath, candidatePath, diffPath);
  }
}
