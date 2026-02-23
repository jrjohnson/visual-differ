import path from 'node:path';
import { test } from '@playwright/test';

const resultsDir = path.resolve(import.meta.dirname, '..', 'results');
const buildDir = path.resolve(import.meta.dirname, '..', 'build');

test('report', async ({ page, browserName }) => {
  const reportPath = path.join(resultsDir, 'index.html');
  await page.goto(`file://${reportPath}`);

  const viewport = page.viewportSize()!;
  await page.screenshot({
    path: path.join(buildDir, `${browserName}-${viewport.width}x${viewport.height}-report.png`),
    fullPage: true,
  });
});
