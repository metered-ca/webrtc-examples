import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsPath = path.join(__dirname, 'assets');

export default defineConfig({
  testDir: './',
  testMatch: '**/*.test.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:5173',
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
      cwd: '../examples/group-video-call',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      cwd: '../examples/group-video-call',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
