import { readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Represents a file found during scanning
 */
export interface ScannedFile {
  /** The name of the file (e.g., "image.png") */
  name: string;
  /** The full absolute path to the file */
  path: string;
}

/**
 * Result of matching files between baseline and candidate directories
 */
export interface FileMatchResult {
  /** Files that exist in both baseline and candidate directories */
  matched: Array<{
    name: string;
    baselinePath: string;
    candidatePath: string;
  }>;
  /** Files that only exist in the baseline directory */
  baselineOnly: ScannedFile[];
  /** Files that only exist in the candidate directory */
  candidateOnly: ScannedFile[];
}

/**
 * Scans a directory and returns all PNG files
 * @param dirPath - Path to the directory to scan
 * @returns Array of PNG files found in the directory
 * @throws Error if directory does not exist or is not accessible
 */
function scanDirectory(dirPath: string): ScannedFile[] {
  let entries: string[];

  try {
    entries = readdirSync(dirPath);
  } catch (error) {
    throw new Error(
      `Failed to read directory: ${dirPath}. ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const pngFiles: ScannedFile[] = [];

  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith('.png')) {
      continue;
    }

    const fullPath = join(dirPath, entry);

    try {
      const stats = statSync(fullPath);
      if (stats.isFile()) {
        pngFiles.push({
          name: entry,
          path: fullPath,
        });
      }
    } catch {
      // Skip files that can't be accessed
      continue;
    }
  }

  return pngFiles.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Scans baseline and candidate directories and matches PNG files by name
 * @param baselineDir - Path to the baseline directory
 * @param candidateDir - Path to the candidate directory
 * @returns Object containing matched files and files unique to each directory
 * @throws Error if either directory does not exist or is not accessible
 */
export function scanAndMatchFiles(baselineDir: string, candidateDir: string): FileMatchResult {
  const baselineFiles = scanDirectory(baselineDir);
  const candidateFiles = scanDirectory(candidateDir);

  // Create maps for quick lookup
  const baselineMap = new Map(baselineFiles.map((f) => [f.name, f.path]));
  const candidateMap = new Map(candidateFiles.map((f) => [f.name, f.path]));

  const matched: FileMatchResult['matched'] = [];
  const baselineOnly: ScannedFile[] = [];
  const candidateOnly: ScannedFile[] = [];

  // Find matched files and baseline-only files
  for (const file of baselineFiles) {
    const candidatePath = candidateMap.get(file.name);

    if (candidatePath !== undefined) {
      matched.push({
        name: file.name,
        baselinePath: file.path,
        candidatePath,
      });
    } else {
      baselineOnly.push(file);
    }
  }

  // Find candidate-only files
  for (const file of candidateFiles) {
    if (!baselineMap.has(file.name)) {
      candidateOnly.push(file);
    }
  }

  return {
    matched,
    baselineOnly,
    candidateOnly,
  };
}
