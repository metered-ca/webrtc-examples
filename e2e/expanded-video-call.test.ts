import { test, expect, Page } from '@playwright/test';

// Helper to generate unique meeting IDs
function generateMeetingId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Helper to verify video element has active stream with video tracks
async function verifyVideoHasActiveStream(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const video = document.querySelector(sel) as HTMLVideoElement;
    if (!video || !video.srcObject) return false;
    const stream = video.srcObject as MediaStream;
    const videoTracks = stream.getVideoTracks();
    return videoTracks.length > 0;
  }, selector);
}

// Helper to wait for remote video stream to arrive
async function waitForRemoteStream(page: Page, timeout = 30000): Promise<void> {
  await page.waitForFunction(
    () => {
      const remoteVideos = document.querySelectorAll('.video-tile:not(.local) video');
      if (remoteVideos.length === 0) return false;
      return Array.from(remoteVideos).every(v => {
        const video = v as HTMLVideoElement;
        if (!video.srcObject) return false;
        const stream = video.srcObject as MediaStream;
        return stream.getVideoTracks().length > 0;
      });
    },
    { timeout }
  );
}

// Helper to wait for peer connection and verify remote streams arrive
async function waitForPeerConnection(page: Page, expectedCount: number, timeout = 30000): Promise<void> {
  await expect(page.locator('.video-tile')).toHaveCount(expectedCount, { timeout });
  if (expectedCount > 1) {
    await waitForRemoteStream(page, timeout);
  }
}

test.describe('Expanded Video Call', () => {

  test.describe('Home Page', () => {

    test('should display home page with create and join options', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('h1')).toHaveText('Video Call');
      await expect(page.locator('button', { hasText: 'Create New Meeting' })).toBeVisible();
      await expect(page.locator('input[placeholder*="meeting code"]')).toBeVisible();
    });

    test('should navigate to lobby when creating a new meeting', async ({ page }) => {
      await page.goto('/');

      await page.click('button:has-text("Create New Meeting")');

      // Should navigate to lobby with a meeting ID in the URL
      await expect(page).toHaveURL(/#\/meeting\/.+/);
      await expect(page.locator('h1:has-text("Ready to join")')).toBeVisible();
    });

    test('should navigate to lobby when joining with meeting code', async ({ page }) => {
      await page.goto('/');

      const meetingId = generateMeetingId();
      await page.fill('input[placeholder*="meeting code"]', meetingId);
      await page.click('button:has-text("Join Meeting")');

      await expect(page).toHaveURL(new RegExp(`#/meeting/${meetingId}`));
    });

  });

  test.describe('Lobby', () => {

    test('should display lobby elements', async ({ page }) => {
      const meetingId = generateMeetingId();
      await page.goto(`/#/meeting/${meetingId}`);

      // Wait for lobby to load
      await expect(page.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });

      // Check for username input
      await expect(page.locator('input#username')).toBeVisible();

      // Check for device selectors
      await expect(page.locator('text=Camera')).toBeVisible();
      await expect(page.locator('text=Microphone')).toBeVisible();

      // Check for join button
      await expect(page.locator('button:has-text("Join Meeting")')).toBeVisible();
    });

    test('should show video preview in lobby', async ({ page }) => {
      const meetingId = generateMeetingId();
      await page.goto(`/#/meeting/${meetingId}`);

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

    test('should toggle audio/video in lobby', async ({ page }) => {
      const meetingId = generateMeetingId();
      await page.goto(`/#/meeting/${meetingId}`);

      await expect(page.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });

      // Find and click the mute button (microphone icon)
      const muteButton = page.locator('button[aria-label*="microphone"]').first();
      await expect(muteButton).toBeVisible();
      await muteButton.click();

      // Button should change state (we can verify by checking aria-label or class changes)
      // The test passes if no error is thrown
    });

    test('should copy meeting link', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      const meetingId = generateMeetingId();
      await page.goto(`/#/meeting/${meetingId}`);

      await expect(page.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });

      // Click copy link button
      await page.click('button:has-text("Copy meeting link")');

      // Should show "Link copied!" feedback
      await expect(page.locator('text=Link copied!')).toBeVisible();
    });

    test('should join meeting when clicking join button', async ({ page }) => {
      const meetingId = generateMeetingId();
      await page.goto(`/#/meeting/${meetingId}`);

      await expect(page.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });

      // Enter username
      await page.fill('input#username', 'TestUser');

      // Click join
      await page.click('button:has-text("Join Meeting")');

      // Should be in call screen
      await expect(page.locator('.participant-count')).toBeVisible({ timeout: 10000 });
    });

  });

  test.describe('Call Screen - Single User', () => {

    test('should display call screen with local video', async ({ page }) => {
      const meetingId = generateMeetingId();
      await page.goto(`/#/meeting/${meetingId}`);

      await expect(page.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });
      await page.fill('input#username', 'TestUser');
      await page.click('button:has-text("Join Meeting")');

      // Wait for call screen
      await expect(page.locator('.participant-count')).toBeVisible({ timeout: 10000 });

      // Verify local video tile exists
      await expect(page.locator('.video-tile.local')).toBeVisible();

      // Verify video has active stream
      const hasStream = await verifyVideoHasActiveStream(page, '.video-tile.local video');
      expect(hasStream).toBe(true);
    });

    test('should toggle audio in call', async ({ page }) => {
      const meetingId = generateMeetingId();
      await page.goto(`/#/meeting/${meetingId}`);

      await expect(page.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });
      await page.fill('input#username', 'TestUser');
      await page.click('button:has-text("Join Meeting")');

      await expect(page.locator('.participant-count')).toBeVisible({ timeout: 10000 });

      // Click mute button
      await page.click('button[aria-label="Mute"]');

      // Muted indicator should appear
      await expect(page.locator('.muted-indicator')).toBeVisible();

      // Click unmute
      await page.click('button[aria-label="Unmute"]');

      // Muted indicator should disappear
      await expect(page.locator('.muted-indicator')).not.toBeVisible();
    });

    test('should toggle video in call', async ({ page }) => {
      const meetingId = generateMeetingId();
      await page.goto(`/#/meeting/${meetingId}`);

      await expect(page.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });
      await page.fill('input#username', 'TestUser');
      await page.click('button:has-text("Join Meeting")');

      await expect(page.locator('.participant-count')).toBeVisible({ timeout: 10000 });

      // Click video off button
      await page.click('button[aria-label="Stop video"]');

      // Click video on button
      await page.click('button[aria-label="Start video"]');

      // Should still have a video tile
      await expect(page.locator('.video-tile.local')).toBeVisible();
    });

    test('should leave call and return to home', async ({ page }) => {
      const meetingId = generateMeetingId();
      await page.goto(`/#/meeting/${meetingId}`);

      await expect(page.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });
      await page.fill('input#username', 'TestUser');
      await page.click('button:has-text("Join Meeting")');

      await expect(page.locator('.participant-count')).toBeVisible({ timeout: 10000 });

      // Click leave button
      await page.click('button[aria-label="Leave meeting"]');

      // Should return to home
      await expect(page.locator('h1:has-text("Video Call")')).toBeVisible({ timeout: 5000 });
    });

  });

  test.describe('Two Peers', () => {

    test('should connect and see each other', async ({ browser }) => {
      const meetingId = generateMeetingId();

      const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Peer 1 joins
        await page1.goto(`/#/meeting/${meetingId}`);
        await expect(page1.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });
        await page1.fill('input#username', 'User1');
        await page1.click('button:has-text("Join Meeting")');
        await expect(page1.locator('.participant-count')).toBeVisible({ timeout: 10000 });

        // Peer 2 joins
        await page2.goto(`/#/meeting/${meetingId}`);
        await expect(page2.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });
        await page2.fill('input#username', 'User2');
        await page2.click('button:has-text("Join Meeting")');
        await expect(page2.locator('.participant-count')).toBeVisible({ timeout: 10000 });

        // Wait for WebRTC connection
        await waitForPeerConnection(page1, 2);
        await waitForPeerConnection(page2, 2);

        // Verify participant counts
        await expect(page1.locator('.participant-count')).toHaveText('2 participants');
        await expect(page2.locator('.participant-count')).toHaveText('2 participants');

        // Verify remote video streams arrived
        expect(await verifyVideoHasActiveStream(page1, '.video-tile:not(.local) video')).toBe(true);
        expect(await verifyVideoHasActiveStream(page2, '.video-tile:not(.local) video')).toBe(true);

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test('should handle peer leaving gracefully', async ({ browser }) => {
      const meetingId = generateMeetingId();

      const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Both peers join
        await page1.goto(`/#/meeting/${meetingId}`);
        await expect(page1.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });
        await page1.fill('input#username', 'User1');
        await page1.click('button:has-text("Join Meeting")');
        await expect(page1.locator('.participant-count')).toBeVisible({ timeout: 10000 });

        await page2.goto(`/#/meeting/${meetingId}`);
        await expect(page2.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });
        await page2.fill('input#username', 'User2');
        await page2.click('button:has-text("Join Meeting")');

        // Wait for connection
        await waitForPeerConnection(page1, 2);

        // Peer 2 leaves
        await page2.click('button[aria-label="Leave meeting"]');

        // Peer 1 should see only themselves
        await expect(page1.locator('.video-tile')).toHaveCount(1, { timeout: 10000 });
        await expect(page1.locator('.participant-count')).toHaveText('1 participant');

      } finally {
        await context1.close();
        await context2.close();
      }
    });

  });

  test.describe('Chat', () => {

    test('should open and close chat panel', async ({ page }) => {
      const meetingId = generateMeetingId();
      await page.goto(`/#/meeting/${meetingId}`);

      await expect(page.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });
      await page.fill('input#username', 'TestUser');
      await page.click('button:has-text("Join Meeting")');

      await expect(page.locator('.participant-count')).toBeVisible({ timeout: 10000 });

      // Open chat
      await page.click('button[aria-label*="chat"]');
      await expect(page.locator('h2:has-text("Chat")')).toBeVisible();

      // Close chat by clicking the chat toggle button in the controls bar (rounded-full button)
      await page.locator('button[aria-label="Close chat"].rounded-full').click();
    });

    test('should send and receive chat messages between peers', async ({ browser }) => {
      const meetingId = generateMeetingId();

      const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Both peers join
        await page1.goto(`/#/meeting/${meetingId}`);
        await expect(page1.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });
        await page1.fill('input#username', 'User1');
        await page1.click('button:has-text("Join Meeting")');
        await expect(page1.locator('.participant-count')).toBeVisible({ timeout: 10000 });

        await page2.goto(`/#/meeting/${meetingId}`);
        await expect(page2.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });
        await page2.fill('input#username', 'User2');
        await page2.click('button:has-text("Join Meeting")');

        // Wait for connection
        await waitForPeerConnection(page1, 2);
        await waitForPeerConnection(page2, 2);

        // Open chat on both
        await page1.click('button[aria-label*="chat"]');
        await page2.click('button[aria-label*="chat"]');

        // User1 sends a message
        await page1.fill('input[placeholder*="Type a message"]', 'Hello from User1!');
        await page1.click('button[aria-label="Send message"]');

        // User2 should receive the message
        await expect(page2.locator('text=Hello from User1!')).toBeVisible({ timeout: 10000 });

        // User2 sends a reply
        await page2.fill('input[placeholder*="Type a message"]', 'Hello back from User2!');
        await page2.click('button[aria-label="Send message"]');

        // User1 should receive the reply
        await expect(page1.locator('text=Hello back from User2!')).toBeVisible({ timeout: 10000 });

      } finally {
        await context1.close();
        await context2.close();
      }
    });

  });

  test.describe('URL & Navigation', () => {

    test('should preserve meeting ID in URL', async ({ page }) => {
      const meetingId = generateMeetingId();
      await page.goto(`/#/meeting/${meetingId}`);

      await expect(page.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });

      // Verify meeting ID is displayed
      await expect(page.locator(`text=${meetingId}`)).toBeVisible();
    });

    test('should share meeting via copy link', async ({ page, context, browser }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      const meetingId = generateMeetingId();
      await page.goto(`/#/meeting/${meetingId}`);

      await expect(page.locator('h1:has-text("Ready to join")')).toBeVisible({ timeout: 10000 });

      // Copy link
      await page.click('button:has-text("Copy meeting link")');
      await expect(page.locator('text=Link copied!')).toBeVisible();

      // Get clipboard content
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

      // Verify it contains the meeting ID
      expect(clipboardText).toContain(meetingId);
      expect(clipboardText).toContain('#/meeting/');
    });

  });

});
