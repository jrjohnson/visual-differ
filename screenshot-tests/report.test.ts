import path from 'node:path';
import { expect, test } from '@playwright/test';

const resultsDir = path.resolve(import.meta.dirname, '..', 'results');
const buildDir = path.resolve(import.meta.dirname, '..', 'build');
const reportUrl = `file://${path.join(resultsDir, 'index.html')}`;

test('report', async ({ page, browserName }) => {
  await page.goto(reportUrl);

  const viewport = page.viewportSize()!;
  await page.waitForTimeout(500); //wait for animations and transitions to finish
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

    await page.waitForTimeout(500); //wait for animations and transitions to finish
    await page.screenshot({
      path: path.join(buildDir, `${prefix}-${slug}.png`),
      fullPage: true,
    });
  }
});

test('cycle images in row on left/right keyboard input', async ({ page }) => {
  await page.goto(reportUrl);

  await page.locator('.diff-images button').first().click();
  await expect(page.locator('dialog#lightbox')).toBeVisible();

  const firstImageCounter = page.locator('.lightbox-image-counter').first();

  await expect(firstImageCounter).toHaveText('Image 1 / 3');

  await page.keyboard.press('ArrowRight');
  await expect(firstImageCounter).toHaveText('Image 2 / 3');

  await page.keyboard.press('ArrowRight');
  await expect(firstImageCounter).toHaveText('Image 3 / 3');

  await page.keyboard.press('ArrowRight');
  await expect(firstImageCounter).toHaveText('Image 1 / 3');

  await page.keyboard.press('ArrowLeft');
  await expect(firstImageCounter).toHaveText('Image 3 / 3');

  await page.keyboard.press('ArrowLeft');
  await expect(firstImageCounter).toHaveText('Image 2 / 3');

  await page.keyboard.press('ArrowLeft');
  await expect(firstImageCounter).toHaveText('Image 1 / 3');
});

test('cycle rows on up/down keyboard input', async ({ page }) => {
  await page.goto(reportUrl);

  await page.locator('.diff-images button').first().click();
  await expect(page.locator('dialog#lightbox')).toBeVisible();

  const firstRowCounter = page.locator('.lightbox-row-counter').first();

  await expect(firstRowCounter).toHaveText('Row 1 / 4');

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 2 / 4');

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 3 / 4');

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 4 / 4');

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 1 / 4');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 4 / 4');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 3 / 4');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 2 / 4');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 1 / 4');
});

test('show temporary modals when wrapping top <-> bottom', async ({ page }) => {
  await page.goto(reportUrl);

  await page.locator('.diff-images button').first().click();
  await expect(page.locator('dialog#lightbox')).toBeVisible();

  const firstRowCounter = page.locator('.lightbox-row-counter').first();

  await expect(firstRowCounter).toHaveText('Row 1 / 4');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 4 / 4');
  await expect(page.getByRole('dialog').filter({ hasText: /^Wrapped to bottom$/ })).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 1 / 4');
  await expect(page.getByRole('dialog').filter({ hasText: /^Wrapped to top$/ })).toBeVisible();
});
