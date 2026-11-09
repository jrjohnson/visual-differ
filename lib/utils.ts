// The kitchen sink

import { join } from 'path';
import { BASELINE_SUFFIX, CANDIDATE_SUFFIX, DIFF_SUFFIX } from './constants.js';

/**
 * Describes three related paths to file comparison outputs.
 */
export interface OutputFilePaths {
  baselinePath: string;
  candidatePath: string;
  diffPath: string;
}

/**
 * Gets the expected output file paths for a given file name in a given output directory.
 * @param outputDir The output directory.
 * @param name The file name.
 */
export function getOutputFilePaths(outputDir: string, name: string): OutputFilePaths {
  // we're only dealing with PNGs.
  const nameWithoutExtension = name.replace(/\.png$/i, '');

  return {
    baselinePath: join(outputDir, `${nameWithoutExtension}${BASELINE_SUFFIX}`),
    candidatePath: join(outputDir, `${nameWithoutExtension}${CANDIDATE_SUFFIX}`),
    diffPath: join(outputDir, `${nameWithoutExtension}${DIFF_SUFFIX}`),
  };
}

// Returns the current time as an ISO 8601 UTC timestamp, e.g. "2026-11-07T00:15:35.123Z"
export function currentTimestamp(): string {
  return new Date().toISOString();
}
