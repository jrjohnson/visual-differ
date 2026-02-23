import path from 'node:path';
import { expect, test } from '@playwright/test';

const resultsDir = path.resolve(import.meta.dirname, '..', 'results');
const buildDir = path.resolve(import.meta.dirname, '..', 'build');
const reportUrl = `file://${path.join(resultsDir, 'index.html')}`;

test('report', async ({ page, browserName }) => {
  await page.goto(reportUrl);

  const viewport = page.viewportSize()!;
  await page.screenshot({
    path: path.join(buildDir, `${browserName}-${viewport.width}x${viewport.height}-report.png`),
    fullPage: true,
  });
});

test('each image click', async ({ page, browserName }) => {
  await page.goto(reportUrl);
  const viewport = page.viewportSize()!;
  const prefix = `${browserName}-${viewport.width}x${viewport.height}`;

  const images = page.locator('.diff-images img');
  const count = await images.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    await page.goto(reportUrl);
    const img = images.nth(i);
    const alt = await img.getAttribute('alt');
    const slug = (alt ?? `image-${i}`)
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/-+$/, '')
      .toLowerCase();

    await img.click();
    await page.waitForLoadState('load');

    await page.screenshot({
      path: path.join(buildDir, `${prefix}-${slug}.png`),
      fullPage: true,
    });
  }
});
