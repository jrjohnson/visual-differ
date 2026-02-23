import { defineConfig } from '@playwright/test';

const browsers = ['chromium', 'firefox', 'webkit'] as const;

const viewports = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

const projects = browsers.flatMap((browser) =>
  Object.entries(viewports).map(([size, viewport]) => ({
    name: `${browser}-${size}`,
    use: {
      browserName: browser,
      viewport,
    },
  })),
);

export default defineConfig({
  testDir: './screenshot-tests',
  globalSetup: './screenshot-tests/global-setup.ts',
  projects,
});
