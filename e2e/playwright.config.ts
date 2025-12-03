import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsPath = path.join(__dirname, 'assets');

// Determine which example to test based on TEST_EXAMPLE env var
const testExample = process.env.TEST_EXAMPLE || 'group-video-call';

const exampleConfigs: Record<string, { serverPort: number; devPort: number }> = {
  'group-video-call': { serverPort: 3000, devPort: 5173 },
  'expanded-video-call': { serverPort: 3001, devPort: 5174 },
};

const config = exampleConfigs[testExample] || exampleConfigs['group-video-call'];

export default defineConfig({
  testDir: './',
  testMatch: `${testExample}.test.ts`,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 60000,

  use: {
    baseURL: `http://localhost:${config.devPort}`,
    trace: 'on-first-retry',
    video: 'retain-on-failure',

    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-video-capture=${path.join(assetsPath, 'mock-video.y4m')}`,
        `--use-file-for-fake-audio-capture=${path.join(assetsPath, 'mock-audio.wav')}`,
        '--allow-file-access',
        '--disable-web-security',
      ],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run server',
      cwd: `../examples/${testExample}`,
      port: config.serverPort,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --port ' + config.devPort,
      cwd: `../examples/${testExample}`,
      port: config.devPort,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
