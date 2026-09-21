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

  await expect(firstRowCounter).toHaveText('Row 1 / 8');

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 2 / 8');

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 3 / 8');

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 4 / 8');

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 5 / 8');

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 6 / 8');

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 7 / 8');

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 8 / 8');

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 1 / 8');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 8 / 8');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 7 / 8');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 6 / 8');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 5 / 8');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 4 / 8');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 3 / 8');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 2 / 8');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 1 / 8');
});

test('show temporary modals when wrapping top <-> bottom', async ({ page }) => {
  await page.goto(reportUrl);

  await page.locator('.diff-images button').first().click();
  await expect(page.locator('dialog#lightbox')).toBeVisible();

  const firstRowCounter = page.locator('.lightbox-row-counter').first();

  await expect(firstRowCounter).toHaveText('Row 1 / 8');

  await page.keyboard.press('ArrowUp');
  await expect(firstRowCounter).toHaveText('Row 8 / 8');
  await expect(page.getByRole('dialog').filter({ hasText: /^Wrapped to bottom$/ })).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await expect(firstRowCounter).toHaveText('Row 1 / 8');
  await expect(page.getByRole('dialog').filter({ hasText: /^Wrapped to top$/ })).toBeVisible();
});

test('shows dimension mismatch warning with only baseline/candidate images', async ({ page }) => {
  await page.goto(reportUrl);

  const card = page.locator('div', { has: page.locator('h3', { hasText: 'resized-banner.png' }) });

  await expect(card.getByText('Dimension mismatch:')).toBeVisible();
  await expect(
    card.getByText('Baseline 600x300, Data length: 720000, Candidate 600x380, Data length: 912000'),
  ).toBeVisible();
  await expect(card.locator('.lightbox-trigger')).toHaveCount(2);
  await expect(card.getByAltText('Baseline screenshot for resized-banner.png')).toBeVisible();
  await expect(card.getByAltText('Candidate screenshot for resized-banner.png')).toBeVisible();
});

test('shows dimension mismatch warning for a channel-count mismatch', async ({ page }) => {
  await page.goto(reportUrl);

  const card = page.locator('div', {
    has: page.locator('h3', { hasText: 'no-alpha-banner.png' }),
  });

  await expect(card.getByText('Dimension mismatch:')).toBeVisible();
  await expect(
    card.getByText('Baseline 400x200, Data length: 240000, Candidate 400x200, Data length: 320000'),
  ).toBeVisible();
  await expect(card.locator('.lightbox-trigger')).toHaveCount(2);
  await expect(card.getByAltText('Baseline screenshot for no-alpha-banner.png')).toBeVisible();
  await expect(card.getByAltText('Candidate screenshot for no-alpha-banner.png')).toBeVisible();
});

test('shows unsupported bit depth warning with only baseline/candidate images', async ({
  page,
}) => {
  await page.goto(reportUrl);

  const card = page.locator('div', {
    has: page.locator('h3', { hasText: 'gradient-mixed-depth.png' }),
  });

  await expect(card.getByText('Unsupported bit depth:')).toBeVisible();
  await expect(card.getByText('Baseline 8-bit, Candidate 16-bit')).toBeVisible();
  await expect(card.locator('.lightbox-trigger')).toHaveCount(2);
  await expect(card.getByAltText('Baseline screenshot for gradient-mixed-depth.png')).toBeVisible();
  await expect(
    card.getByAltText('Candidate screenshot for gradient-mixed-depth.png'),
  ).toBeVisible();
});

test('shows added candidate image as reviewable lightbox image', async ({ page }) => {
  await page.goto(reportUrl);

  await expect(
    page.getByRole('heading', { name: 'Added in Candidate (1)', exact: true }),
  ).toBeVisible();

  const card = page.locator('div', {
    has: page.locator('h3', { hasText: 'happy-chihuahua.png' }),
  });

  await expect(card.getByAltText('New candidate screenshot for happy-chihuahua.png')).toBeVisible();
  await expect(card.locator('.lightbox-trigger')).toHaveCount(1);
  await expect(card.locator('img')).toHaveAttribute('src', 'images/new/happy-chihuahua.png');
});

test('opens added candidate image in lightbox with single-image counter', async ({ page }) => {
  await page.goto(reportUrl);

  const trigger = page
    .locator('.diff-images[data-lightbox-group="added"] .lightbox-trigger')
    .first();
  await trigger.click();
  await expect(page.locator('dialog#lightbox')).toBeVisible();

  await expect(page.locator('.lightbox-image-counter').first()).toHaveText('Image 1 / 1');
  await expect(page.locator('.lightbox-row-counter').first()).toHaveText('');
});

test('does not cycle rows from added candidate image on up/down keyboard input', async ({
  page,
}) => {
  await page.goto(reportUrl);

  const trigger = page
    .locator('.diff-images[data-lightbox-group="added"] .lightbox-trigger')
    .first();
  await trigger.click();
  await expect(page.locator('dialog#lightbox')).toBeVisible();

  const imageCounter = page.locator('.lightbox-image-counter').first();
  const filename = page.locator('.lightbox-image-filename').first();

  await expect(imageCounter).toHaveText('Image 1 / 1');
  await expect(filename).toHaveText('happy-chihuahua.png');

  await page.keyboard.press('ArrowDown');
  await expect(imageCounter).toHaveText('Image 1 / 1');
  await expect(filename).toHaveText('happy-chihuahua.png');

  await page.keyboard.press('ArrowUp');
  await expect(imageCounter).toHaveText('Image 1 / 1');
  await expect(filename).toHaveText('happy-chihuahua.png');
});
