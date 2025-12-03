import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsPath = path.join(__dirname, '..', 'assets');

export const mockMediaArgs = [
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  `--use-file-for-fake-video-capture=${path.join(assetsPath, 'mock-video.y4m')}`,
  `--use-file-for-fake-audio-capture=${path.join(assetsPath, 'mock-audio.wav')}`,
  '--allow-file-access',
];

export const webrtcArgs = [
  ...mockMediaArgs,
  '--disable-web-security',
  '--disable-features=IsolateOrigins,site-per-process',
];
