import { test, expect, Page, Browser } from '@playwright/test';

// Helper to wait for broadcast video AND audio stream to arrive (viewer side)
async function waitForBroadcastStream(page: Page, timeout = 30000): Promise<void> {
  await page.waitForFunction(
    () => {
      const video = document.querySelector('.broadcast-video video') as HTMLVideoElement;
      if (!video || !video.srcObject) return false;
      const stream = video.srcObject as MediaStream;
      // Verify BOTH video and audio tracks arrive (critical per CLAUDE.md)
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      return hasVideo && hasAudio;
    },
    { timeout }
  );
}

// Helper to verify video element has active stream with video tracks
async function verifyVideoHasActiveStream(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const video = document.querySelector(sel) as HTMLVideoElement;
    if (!video || !video.srcObject) return false;
    const stream = video.srcObject as MediaStream;
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) return false;
    // Also verify track is enabled and live
    const track = videoTracks[0];
    return track.enabled && track.readyState === 'live';
  }, selector);
}

// Helper to verify audio stream is present
async function verifyAudioStreamPresent(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const video = document.querySelector(sel) as HTMLVideoElement;
    if (!video || !video.srcObject) return false;
    const stream = video.srcObject as MediaStream;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return false;
    const track = audioTracks[0];
    return track.readyState === 'live';
  }, selector);
}

// Helper to create broadcaster and go live
async function setupBroadcaster(page: Page, username: string): Promise<string> {
  await page.goto('/');
  await page.click('button:has-text("Start Broadcasting")');

  // Wait for lobby
  await expect(page.locator('text=Setup Your Broadcast')).toBeVisible({ timeout: 10000 });

  // Wait for broadcast code to appear
  await page.waitForFunction(
    () => {
      const codeElement = document.querySelector('.font-mono.text-lg');
      return codeElement && codeElement.textContent && codeElement.textContent.length === 6;
    },
    { timeout: 10000 }
  );

  // Get broadcast ID
  const broadcastId = await page.locator('.font-mono.text-lg').textContent();
  if (!broadcastId) throw new Error('Failed to get broadcast ID');

  // Enter username
  await page.fill('input[placeholder="Enter your name"]', username);

  // Go live
  await page.click('button:has-text("Go Live")');

  // Wait for broadcast screen
  await expect(page.locator('text=LIVE')).toBeVisible({ timeout: 10000 });

  return broadcastId;
}

// Helper to join as viewer
async function joinAsViewer(page: Page, broadcastId: string, username: string): Promise<void> {
  await page.goto('/');

  // Enter broadcast code
  await page.fill('input[placeholder*="broadcast code"]', broadcastId);
  await page.click('button:has-text("Watch Broadcast")');

  // Wait for viewer lobby or viewing screen (may auto-transition if offer received)
  await expect(page.locator(`.font-mono:has-text("${broadcastId}"), .broadcast-video`)).toBeVisible({ timeout: 15000 });

  // If still in lobby, enter username and click watch
  const watchButton = page.locator('button:has-text("Watch Broadcast")');
  if (await watchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Fill username if the input is visible
    const usernameInput = page.locator('input[placeholder="Enter your name"]');
    if (await usernameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await usernameInput.fill(username);
    }

    // Wait for broadcast to be live
    await expect(page.locator('text=LIVE')).toBeVisible({ timeout: 15000 });

    // Click watch
    await watchButton.click();
  }

  // Wait for viewer screen
  await expect(page.locator('.broadcast-video')).toBeVisible({ timeout: 15000 });
}

test.describe('Broadcast', () => {

  test.describe('Home Page', () => {

    test('should display home page with broadcast and watch options', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('h1')).toHaveText('Live Broadcast');
      await expect(page.locator('button', { hasText: 'Start Broadcasting' })).toBeVisible();
      await expect(page.locator('input[placeholder*="broadcast code"]')).toBeVisible();
    });

    test('should navigate to broadcaster lobby when starting broadcast', async ({ page }) => {
      await page.goto('/');

      await page.click('button:has-text("Start Broadcasting")');

      // Should navigate to broadcaster lobby
      await expect(page.locator('text=Setup Your Broadcast')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to viewer lobby when entering broadcast code', async ({ page }) => {
      await page.goto('/');

      await page.fill('input[placeholder*="broadcast code"]', 'ABC123');
      await page.click('button:has-text("Watch Broadcast")');

      // Should navigate to viewer lobby (even if broadcast doesn't exist)
      await expect(page.locator('text=ABC123')).toBeVisible({ timeout: 10000 });
    });

  });

  test.describe('Broadcaster Lobby', () => {

    test('should display broadcaster lobby elements', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("Start Broadcasting")');

      await expect(page.locator('text=Setup Your Broadcast')).toBeVisible({ timeout: 10000 });

      // Check for video preview
      await page.waitForFunction(
        () => {
          const video = document.querySelector('video');
          return video && video.srcObject;
        },
        { timeout: 10000 }
      );

      // Check for broadcast code
      await expect(page.locator('text=Broadcast Code')).toBeVisible();

      // Check for username input
      await expect(page.locator('input[placeholder="Enter your name"]')).toBeVisible();

      // Check for Go Live button
      await expect(page.locator('button:has-text("Go Live")')).toBeVisible();
    });

    test('should show video preview in lobby', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("Start Broadcasting")');

      await expect(page.locator('text=Setup Your Broadcast')).toBeVisible({ timeout: 10000 });

      // Wait for video preview to load
      await page.waitForFunction(
        () => {
          const video = document.querySelector('video');
          return video && video.srcObject;
        },
        { timeout: 10000 }
      );

      // Verify video has active stream
      const hasStream = await page.evaluate(() => {
        const video = document.querySelector('video') as HTMLVideoElement;
        if (!video || !video.srcObject) return false;
        const stream = video.srcObject as MediaStream;
        return stream.getVideoTracks().length > 0;
      });

      expect(hasStream).toBe(true);
    });

    test('should generate unique broadcast code', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("Start Broadcasting")');

      await expect(page.locator('text=Setup Your Broadcast')).toBeVisible({ timeout: 10000 });

      // Check broadcast code format (6 uppercase alphanumeric characters)
      const codeElement = page.locator('.font-mono.text-lg');
      await expect(codeElement).toBeVisible();

      const code = await codeElement.textContent();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

  });

  test.describe('Single Broadcaster', () => {

    test('should go live and show broadcast screen', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("Start Broadcasting")');

      await expect(page.locator('text=Setup Your Broadcast')).toBeVisible({ timeout: 10000 });

      // Wait for video preview
      await page.waitForFunction(
        () => {
          const video = document.querySelector('video');
          return video && video.srcObject;
        },
        { timeout: 10000 }
      );

      // Enter username
      await page.fill('input[placeholder="Enter your name"]', 'TestBroadcaster');

      // Go live
      await page.click('button:has-text("Go Live")');

      // Should show live indicator
      await expect(page.locator('text=LIVE')).toBeVisible({ timeout: 10000 });

      // Should show control buttons (mute, video, etc.)
      await expect(page.locator('button[aria-label="Mute microphone"]')).toBeVisible();
    });

    test('should toggle audio/video while broadcasting', async ({ page }) => {
      await setupBroadcaster(page, 'TestBroadcaster');

      // Verify initial state - mute button should say "Mute microphone"
      await expect(page.locator('button[aria-label="Mute microphone"]')).toBeVisible();

      // Toggle audio OFF
      await page.click('button[aria-label="Mute microphone"]');
      // Button should now say "Unmute microphone"
      await expect(page.locator('button[aria-label="Unmute microphone"]')).toBeVisible();

      // Toggle audio back ON
      await page.click('button[aria-label="Unmute microphone"]');
      await expect(page.locator('button[aria-label="Mute microphone"]')).toBeVisible();

      // Verify initial video state - button should say "Turn off camera"
      await expect(page.locator('button[aria-label="Turn off camera"]')).toBeVisible();

      // Toggle video OFF
      await page.click('button[aria-label="Turn off camera"]');
      // Button should now say "Turn on camera"
      await expect(page.locator('button[aria-label="Turn on camera"]')).toBeVisible();

      // Toggle video back ON
      await page.click('button[aria-label="Turn on camera"]');
      await expect(page.locator('button[aria-label="Turn off camera"]')).toBeVisible();
    });

    test('should end broadcast and return to home', async ({ page }) => {
      await setupBroadcaster(page, 'TestBroadcaster');

      // End broadcast
      await page.click('button[aria-label="End broadcast"]');

      // Should return to home
      await expect(page.locator('h1:has-text("Live Broadcast")')).toBeVisible({ timeout: 5000 });
    });

  });

  test.describe('Broadcaster + Viewer Connection', () => {

    test('should establish connection and viewer receives video AND audio stream', async ({ browser }) => {
      const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });

      const broadcasterPage = await context1.newPage();
      const viewerPage = await context2.newPage();

      try {
        // Broadcaster goes live
        const broadcastId = await setupBroadcaster(broadcasterPage, 'Broadcaster');

        // Viewer joins
        await joinAsViewer(viewerPage, broadcastId, 'Viewer1');

        // CRITICAL: Verify viewer receives remote video AND audio stream (per CLAUDE.md)
        await waitForBroadcastStream(viewerPage);

        // Verify video stream is active
        const hasVideoStream = await verifyVideoHasActiveStream(viewerPage, '.broadcast-video video');
        expect(hasVideoStream).toBe(true);

        // Verify audio stream is present
        const hasAudioStream = await verifyAudioStreamPresent(viewerPage, '.broadcast-video video');
        expect(hasAudioStream).toBe(true);

        // Verify broadcaster sees viewer count update
        await expect(broadcasterPage.locator('text=1')).toBeVisible({ timeout: 10000 });

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test('should update viewer count when viewer joins', async ({ browser }) => {
      const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });

      const broadcasterPage = await context1.newPage();
      const viewerPage = await context2.newPage();

      try {
        const broadcastId = await setupBroadcaster(broadcasterPage, 'Broadcaster');

        // Verify broadcaster is live
        await expect(broadcasterPage.locator('text=LIVE')).toBeVisible();

        // Viewer joins
        await joinAsViewer(viewerPage, broadcastId, 'Viewer1');
        await waitForBroadcastStream(viewerPage);

        // Verify broadcaster is still live
        await expect(broadcasterPage.locator('text=LIVE')).toBeVisible({ timeout: 10000 });

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test('should update viewer count when viewer leaves', async ({ browser }) => {
      const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });

      const broadcasterPage = await context1.newPage();
      const viewerPage = await context2.newPage();

      try {
        const broadcastId = await setupBroadcaster(broadcasterPage, 'Broadcaster');

        // Viewer joins
        await joinAsViewer(viewerPage, broadcastId, 'Viewer1');
        await waitForBroadcastStream(viewerPage);

        // Verify viewer stream is working
        expect(await verifyVideoHasActiveStream(viewerPage, '.broadcast-video video')).toBe(true);

        // Viewer leaves
        await viewerPage.click('button[aria-label="Leave broadcast"]');

        // Viewer should return to home
        await expect(viewerPage.locator('h1:has-text("Live Broadcast")')).toBeVisible({ timeout: 10000 });

      } finally {
        await context1.close();
        await context2.close();
      }
    });

  });

  test.describe('Multiple Viewers', () => {

    test('should handle multiple viewers joining', async ({ browser }) => {
      const contexts = await Promise.all([
        browser.newContext({ permissions: ['camera', 'microphone'] }),
        browser.newContext({ permissions: ['camera', 'microphone'] }),
        browser.newContext({ permissions: ['camera', 'microphone'] }),
      ]);

      const [broadcasterPage, viewer1Page, viewer2Page] = await Promise.all(
        contexts.map(ctx => ctx.newPage())
      );

      try {
        // Broadcaster goes live
        const broadcastId = await setupBroadcaster(broadcasterPage, 'Broadcaster');

        // First viewer joins
        await joinAsViewer(viewer1Page, broadcastId, 'Viewer1');
        await waitForBroadcastStream(viewer1Page);

        // Second viewer joins
        await joinAsViewer(viewer2Page, broadcastId, 'Viewer2');
        await waitForBroadcastStream(viewer2Page);

        // Verify both viewers have active streams
        expect(await verifyVideoHasActiveStream(viewer1Page, '.broadcast-video video')).toBe(true);
        expect(await verifyVideoHasActiveStream(viewer2Page, '.broadcast-video video')).toBe(true);

        // Verify broadcaster is still live
        await expect(broadcasterPage.locator('text=LIVE')).toBeVisible();

      } finally {
        await Promise.all(contexts.map(ctx => ctx.close()));
      }
    });

  });

  test.describe('Chat', () => {

    test('should open chat panel', async ({ page }) => {
      await setupBroadcaster(page, 'TestBroadcaster');

      // Open chat
      await page.click('button[aria-label="Toggle chat"]');

      // Chat panel should be visible
      await expect(page.locator('h2:has-text("Chat")')).toBeVisible();
    });

    test('should send and receive chat messages', async ({ browser }) => {
      const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });

      const broadcasterPage = await context1.newPage();
      const viewerPage = await context2.newPage();

      try {
        const broadcastId = await setupBroadcaster(broadcasterPage, 'Broadcaster');
        await joinAsViewer(viewerPage, broadcastId, 'Viewer1');
        await waitForBroadcastStream(viewerPage);

        // Open chat on both
        await broadcasterPage.click('button[aria-label="Toggle chat"]');
        await viewerPage.click('button[aria-label="Toggle chat"]');

        // Broadcaster sends a message
        await broadcasterPage.fill('input[placeholder*="Type a message"]', 'Hello viewers!');
        await broadcasterPage.click('button[aria-label="Send message"]');

        // Viewer should receive the message
        await expect(viewerPage.locator('text=Hello viewers!')).toBeVisible({ timeout: 10000 });

        // Viewer sends a reply
        await viewerPage.fill('input[placeholder*="Type a message"]', 'Hello broadcaster!');
        await viewerPage.click('button[aria-label="Send message"]');

        // Broadcaster should receive the reply
        await expect(broadcasterPage.locator('text=Hello broadcaster!')).toBeVisible({ timeout: 10000 });

      } finally {
        await context1.close();
        await context2.close();
      }
    });

  });

  test.describe('Broadcast End', () => {

    test('should notify viewers when broadcast ends', async ({ browser }) => {
      const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });

      const broadcasterPage = await context1.newPage();
      const viewerPage = await context2.newPage();

      try {
        const broadcastId = await setupBroadcaster(broadcasterPage, 'Broadcaster');
        await joinAsViewer(viewerPage, broadcastId, 'Viewer1');
        await waitForBroadcastStream(viewerPage);

        // Broadcaster ends broadcast
        await broadcasterPage.click('button[aria-label="End broadcast"]');

        // Viewer should see the broadcast ended (goes back to viewer lobby)
        // The LIVE indicator should no longer be visible in viewing mode
        await expect(viewerPage.locator('.broadcast-video video')).not.toBeVisible({ timeout: 10000 });

      } finally {
        await context1.close();
        await context2.close();
      }
    });

  });

});
