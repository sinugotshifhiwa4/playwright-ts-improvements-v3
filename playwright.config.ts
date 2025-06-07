import { defineConfig, devices } from '@playwright/test';
import { OrtoniReportConfig } from 'ortoni-report';
import EnvironmentDetector from './src/config/environment/detector/detector';
import path from 'path';
import { TIMEOUTS } from './src/config/timeouts/timeout.config';
import BrowserInitFlag from './src/config/browserInitFlag';

const reportConfig: OrtoniReportConfig = {
  open: EnvironmentDetector.isCI() ? 'never' : 'always',
  folderPath: 'ortoni-report',
  filename: 'index.html',
  logo: path.resolve(process.cwd(), ''),
  title: 'Improvements V3 Test Report',
  showProject: false,
  projectName: 'playwright-ts-improvements-v3',
  testType: process.env.TEST_TYPE || 'Regression | Sanity',
  authorName: 'Tshifhiwa Sinugo',
  base64Image: false,
  stdIO: false,
  preferredTheme: 'dark',
  meta: {
    project: 'application-model',
    platform: process.env.TEST_PLATFORM || 'Windows',
    environment: process.env.ENV || 'DEV',
    version: process.env.APP_VERSION || '3.0.0',
  },
};

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  timeout: TIMEOUTS.test,
  expect: {
    timeout: TIMEOUTS.expect,
  },
  testDir: './tests',
  globalSetup: './src/config/environment/global/globalEnvironmentSetup.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? undefined : 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: EnvironmentDetector.isCI()
    ? [
        ['junit', { outputFile: 'results.xml' }],
        ['playwright-trx-reporter', { outputFile: 'results.trx' }],
        ['ortoni-report', reportConfig],
        ['html', { open: 'never' }],
        ['dot'],
      ]
    : [
        ['html', { open: 'never' }],
        ['ortoni-report', reportConfig],
        ['dot'],
        ['junit', { outputFile: 'results.xml' }],
        ['playwright-trx-reporter', { outputFile: 'results.trx' }],
      ],

  grep:
    typeof process.env.PLAYWRIGHT_GREP === 'string'
      ? new RegExp(process.env.PLAYWRIGHT_GREP)
      : process.env.PLAYWRIGHT_GREP || /.*/,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: EnvironmentDetector.isCI() ? 'only-on-failure' : 'on',
    video: EnvironmentDetector.isCI() ? 'on' : 'retain-on-failure',
    actionTimeout: TIMEOUTS.ui.action,
    navigationTimeout: TIMEOUTS.ui.navigation,
  },

  /* Configure projects for major browsers */
  projects: [
    /*
     * Project configuration with conditional browser setup:
     *
     * 1. When shouldSkipBrowserInit is FALSE (normal mode):
     *    - Additional browser configurations can be included if needed
     *
     * 2. When shouldSkipBrowserInit is TRUE (performance optimization):
     *    - No additional setup projects are included
     *    - This optimization is useful for operations that don't need browser context
     *      like crypto or database-only operations
     */
    ...(!BrowserInitFlag.shouldSkipBrowserInit() ? [] : []),
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
