#!/usr/bin/env node

import { Command } from 'commander';
import { existsSync, statSync, mkdirSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { compareDirectories } from '../lib/visual-differ.js';

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'),
) as { version: string };

const program = new Command();

program
  .name('visual-differ')
  .description('Compare PNG screenshots between two directories and generate visual diff report')
  .version(packageJson.version)
  .argument('<baseline-dir>', 'Directory containing baseline (expected) screenshots')
  .argument('<candidate-dir>', 'Directory containing candidate (actual) screenshots')
  .argument('<output-dir>', 'Directory where diff images and report will be written')
  .option(
    '--threshold <number>',
    'Matching threshold for pixelmatch (0-1, lower = more sensitive, default 0.1)',
    parseFloat,
  )
  .action(
    (
      baselineDir: string,
      candidateDir: string,
      outputDir: string,
      options: { threshold?: number },
    ) => {
      try {
        // Resolve to absolute paths
        const resolvedBaseline = resolve(baselineDir);
        const resolvedCandidate = resolve(candidateDir);
        const resolvedOutput = resolve(outputDir);

        // Validate baseline directory
        if (!existsSync(resolvedBaseline) || !statSync(resolvedBaseline).isDirectory()) {
          console.error(
            `Error: Baseline directory does not exist or is not a directory: ${resolvedBaseline}`,
          );
          process.exit(1);
        }

        // Validate candidate directory
        if (!existsSync(resolvedCandidate) || !statSync(resolvedCandidate).isDirectory()) {
          console.error(
            `Error: Candidate directory does not exist or is not a directory: ${resolvedCandidate}`,
          );
          process.exit(1);
        }

        // Create output directory if it doesn't exist
        if (!existsSync(resolvedOutput)) {
          mkdirSync(resolvedOutput, { recursive: true });
        } else if (!statSync(resolvedOutput).isDirectory()) {
          console.error(`Error: Output path exists but is not a directory: ${resolvedOutput}`);
          process.exit(1);
        }

        // Run comparison
        console.log('🔍 Comparing screenshots...\n');
        console.log(`  Baseline: ${resolvedBaseline}`);
        console.log(`  Candidate: ${resolvedCandidate}`);
        console.log(`  Output: ${resolvedOutput}\n`);

        const result = compareDirectories(
          resolvedBaseline,
          resolvedCandidate,
          resolvedOutput,
          options.threshold,
        );

        // Display summary
        console.log('📊 Results:');
        console.log(`  Total images: ${result.totalImages}`);
        console.log(`  With differences: ${result.withDifferences}`);
        console.log(`  Identical: ${result.withoutDifferences}`);
        console.log(`  Removed: ${result.removedFiles}`);
        console.log(`  Added: ${result.addedFiles}\n`);

        if (result.exitCode === 0) {
          console.log('✅ All checks passed!');
        } else {
          console.log('❌ Visual differences detected.');
        }

        console.log(`\n📄 Report generated: ${resolvedOutput}/index.html\n`);

        process.exit(result.exitCode);
      } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    },
  );

program.parse();
