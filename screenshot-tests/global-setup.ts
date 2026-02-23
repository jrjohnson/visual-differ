import { execFileSync } from 'node:child_process';
import path from 'node:path';

function globalSetup(): void {
  const projectRoot = path.resolve(import.meta.dirname, '..');
  try {
    execFileSync('pnpm', ['samples'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } catch (error: unknown) {
    // Exit code 1 is expected — it means visual differences were detected
    if (error instanceof Error && 'status' in error && error.status !== 1) {
      throw error;
    }
  }
}

export default globalSetup;
