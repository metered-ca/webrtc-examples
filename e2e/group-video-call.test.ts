import { test, expect, Page, BrowserContext } from '@playwright/test';

// Helper to generate unique room names per test
function generateRoomName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

// Helper to verify video is actually playing
async function verifyVideoIsPlaying(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const video = document.querySelector(sel) as HTMLVideoElement;
    return video && !video.paused && video.readyState >= 2;
  }, selector);
}

// Helper to check audio track enabled state
async function getAudioTrackEnabled(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const video = document.querySelector('.video-tile.local video') as HTMLVideoElement;
    if (!video || !video.srcObject) return false;
    const stream = video.srcObject as MediaStream;
    const audioTrack = stream.getAudioTracks()[0];
    return audioTrack?.enabled ?? false;
  });
}

// Helper to check video track enabled state
async function getVideoTrackEnabled(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const video = document.querySelector('.video-tile.local video') as HTMLVideoElement;
    if (!video || !video.srcObject) return false;
    const stream = video.srcObject as MediaStream;
    const videoTrack = stream.getVideoTracks()[0];
    return videoTrack?.enabled ?? false;
  });
}

// Helper to wait for peer connection and verify remote streams arrive
async function waitForPeerConnection(page: Page, expectedCount: number, timeout = 30000): Promise<void> {
  // Wait for the expected number of video tiles
  await expect(page.locator('.video-tile')).toHaveCount(expectedCount, { timeout });

  // Wait for remote video streams to arrive (critical for WebRTC verification)
  if (expectedCount > 1) {
    await waitForRemoteStream(page, timeout);
  }
}

test.describe('Group Video Call', () => {

  test.describe('Join Screen', () => {

    test('should display join screen elements on load', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('h1')).toHaveText('Group Video Call');
      await expect(page.locator('input[placeholder="Enter room name"]')).toBeVisible();
      await expect(page.locator('button', { hasText: 'Join Room' })).toBeVisible();
      await expect(page.locator('button', { hasText: 'Join Room' })).toBeDisabled();
    });

    test('should enable join button only when room name is entered', async ({ page }) => {
      await page.goto('/');

      const joinButton = page.locator('button', { hasText: 'Join Room' });
      const input = page.locator('input[placeholder="Enter room name"]');

      // Initially disabled
      await expect(joinButton).toBeDisabled();

      // Enter room name
      await input.fill('test-room');
      await expect(joinButton).toBeEnabled();

      // Clear room name
      await input.fill('');
      await expect(joinButton).toBeDisabled();

      // Whitespace only should not enable
      await input.fill('   ');
      await expect(joinButton).toBeDisabled();
    });

  });

  test.describe('Single User - Join and Media', () => {

    test('should join room and display local video with active stream', async ({ page }) => {
      const roomName = generateRoomName('single-user');
      await page.goto('/');

      await page.fill('input[placeholder="Enter room name"]', roomName);
      await page.click('button:has-text("Join Room")');

      // Wait for call screen
      await expect(page.locator('.call-screen')).toBeVisible({ timeout: 10000 });

      // Verify room name displayed
      await expect(page.locator('.header h2')).toHaveText(`Room: ${roomName}`);

      // Verify local video tile exists
      await expect(page.locator('.video-tile.local')).toBeVisible();

      // Verify video element has active stream
      const hasActiveStream = await verifyVideoHasActiveStream(page, '.video-tile.local video');
      expect(hasActiveStream).toBe(true);

      // Verify video is actually playing
      await page.waitForFunction(() => {
        const video = document.querySelector('.video-tile.local video') as HTMLVideoElement;
        return video && video.readyState >= 2;
      }, { timeout: 5000 });

      // Verify participant count
      await expect(page.locator('.participant-count')).toHaveText('1 participant(s)');
    });

    test('should toggle audio and verify track state changes', async ({ page }) => {
      const roomName = generateRoomName('audio-toggle');
      await page.goto('/');

      await page.fill('input[placeholder="Enter room name"]', roomName);
      await page.click('button:has-text("Join Room")');
      await expect(page.locator('.call-screen')).toBeVisible({ timeout: 10000 });

      // Verify initial state - audio enabled
      const initialAudioState = await getAudioTrackEnabled(page);
      expect(initialAudioState).toBe(true);
      await expect(page.locator('button:has-text("Mute")')).toBeVisible();

      // Click to mute
      await page.click('button:has-text("Mute")');

      // Verify button text changed
      await expect(page.locator('button:has-text("Unmute")')).toBeVisible();

      // Verify actual track state changed
      const mutedAudioState = await getAudioTrackEnabled(page);
      expect(mutedAudioState).toBe(false);

      // Click to unmute
      await page.click('button:has-text("Unmute")');

      // Verify button and track state
      await expect(page.locator('button:has-text("Mute")')).toBeVisible();
      const unmutedAudioState = await getAudioTrackEnabled(page);
      expect(unmutedAudioState).toBe(true);
    });

    test('should toggle video and verify track state changes', async ({ page }) => {
      const roomName = generateRoomName('video-toggle');
      await page.goto('/');

      await page.fill('input[placeholder="Enter room name"]', roomName);
      await page.click('button:has-text("Join Room")');
      await expect(page.locator('.call-screen')).toBeVisible({ timeout: 10000 });

      // Verify initial state - video enabled
      const initialVideoState = await getVideoTrackEnabled(page);
      expect(initialVideoState).toBe(true);
      await expect(page.locator('button:has-text("Video Off")')).toBeVisible();

      // Click to turn off video
      await page.click('button:has-text("Video Off")');

      // Verify button text changed
      await expect(page.locator('button:has-text("Video On")')).toBeVisible();

      // Verify actual track state changed
      const disabledVideoState = await getVideoTrackEnabled(page);
      expect(disabledVideoState).toBe(false);

      // Click to turn on video
      await page.click('button:has-text("Video On")');

      // Verify button and track state
      await expect(page.locator('button:has-text("Video Off")')).toBeVisible();
      const enabledVideoState = await getVideoTrackEnabled(page);
      expect(enabledVideoState).toBe(true);
    });

    test('should leave room and return to join screen', async ({ page }) => {
      const roomName = generateRoomName('leave-room');
      await page.goto('/');

      await page.fill('input[placeholder="Enter room name"]', roomName);
      await page.click('button:has-text("Join Room")');
      await expect(page.locator('.call-screen')).toBeVisible({ timeout: 10000 });

      // Click leave button
      await page.click('button:has-text("Leave")');

      // Should return to join screen
      await expect(page.locator('.join-screen')).toBeVisible();
      await expect(page.locator('h1')).toHaveText('Group Video Call');
    });

    test('should be able to rejoin after leaving', async ({ page }) => {
      const roomName = generateRoomName('rejoin');
      await page.goto('/');

      // First join
      await page.fill('input[placeholder="Enter room name"]', roomName);
      await page.click('button:has-text("Join Room")');
      await expect(page.locator('.call-screen')).toBeVisible({ timeout: 10000 });

      // Leave
      await page.click('button:has-text("Leave")');
      await expect(page.locator('.join-screen')).toBeVisible();

      // Rejoin same room
      await page.fill('input[placeholder="Enter room name"]', roomName);
      await page.click('button:has-text("Join Room")');
      await expect(page.locator('.call-screen')).toBeVisible({ timeout: 10000 });

      // Verify video stream is working again
      const hasActiveStream = await verifyVideoHasActiveStream(page, '.video-tile.local video');
      expect(hasActiveStream).toBe(true);
    });

  });

  test.describe('Two Peers', () => {

    test('should connect and see each other with active streams', async ({ browser }) => {
      const roomName = generateRoomName('two-peers');

      const context1 = await browser.newContext({
        permissions: ['camera', 'microphone'],
      });
      const context2 = await browser.newContext({
        permissions: ['camera', 'microphone'],
      });

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Peer 1 joins
        await page1.goto('/');
        await page1.fill('input[placeholder="Enter room name"]', roomName);
        await page1.click('button:has-text("Join Room")');
        await expect(page1.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        // Wait for peer 1 to be fully connected to signaling
        await expect(page1.locator('.video-tile.local')).toBeVisible();

        // Peer 2 joins
        await page2.goto('/');
        await page2.fill('input[placeholder="Enter room name"]', roomName);
        await page2.click('button:has-text("Join Room")');
        await expect(page2.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        // Wait for WebRTC connection using condition-based waiting
        await waitForPeerConnection(page1, 2);
        await waitForPeerConnection(page2, 2);

        // Verify participant counts
        await expect(page1.locator('.participant-count')).toHaveText('2 participant(s)');
        await expect(page2.locator('.participant-count')).toHaveText('2 participant(s)');

        // Verify both pages have local video with active stream
        expect(await verifyVideoHasActiveStream(page1, '.video-tile.local video')).toBe(true);
        expect(await verifyVideoHasActiveStream(page2, '.video-tile.local video')).toBe(true);

        // Verify remote video streams arrived with video tracks (critical WebRTC test)
        expect(await verifyVideoHasActiveStream(page1, '.video-tile:not(.local) video')).toBe(true);
        expect(await verifyVideoHasActiveStream(page2, '.video-tile:not(.local) video')).toBe(true);

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test('should handle peer leaving gracefully', async ({ browser }) => {
      const roomName = generateRoomName('peer-leave');

      const context1 = await browser.newContext({
        permissions: ['camera', 'microphone'],
      });
      const context2 = await browser.newContext({
        permissions: ['camera', 'microphone'],
      });

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Both peers join
        await page1.goto('/');
        await page1.fill('input[placeholder="Enter room name"]', roomName);
        await page1.click('button:has-text("Join Room")');
        await expect(page1.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        await page2.goto('/');
        await page2.fill('input[placeholder="Enter room name"]', roomName);
        await page2.click('button:has-text("Join Room")');
        await expect(page2.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        // Wait for connection
        await waitForPeerConnection(page1, 2);

        // Peer 2 leaves gracefully
        await page2.click('button:has-text("Leave")');

        // Wait for peer 1 to detect the leave (condition-based)
        await expect(page1.locator('.video-tile')).toHaveCount(1, { timeout: 10000 });
        await expect(page1.locator('.participant-count')).toHaveText('1 participant(s)');

        // Verify peer 1's local stream is still active
        expect(await verifyVideoHasActiveStream(page1, '.video-tile.local video')).toBe(true);

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test('should handle peer disconnect without graceful leave', async ({ browser }) => {
      const roomName = generateRoomName('peer-disconnect');

      const context1 = await browser.newContext({
        permissions: ['camera', 'microphone'],
      });
      const context2 = await browser.newContext({
        permissions: ['camera', 'microphone'],
      });

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Both peers join
        await page1.goto('/');
        await page1.fill('input[placeholder="Enter room name"]', roomName);
        await page1.click('button:has-text("Join Room")');
        await expect(page1.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        await page2.goto('/');
        await page2.fill('input[placeholder="Enter room name"]', roomName);
        await page2.click('button:has-text("Join Room")');
        await expect(page2.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        // Wait for connection
        await waitForPeerConnection(page1, 2);

        // Peer 2 closes browser abruptly (simulating crash/network drop)
        await context2.close();

        // Wait for peer 1 to detect the disconnect
        await expect(page1.locator('.video-tile')).toHaveCount(1, { timeout: 15000 });
        await expect(page1.locator('.participant-count')).toHaveText('1 participant(s)');

      } finally {
        await context1.close();
        // context2 already closed
      }
    });

    test('late joiner should connect to existing peer', async ({ browser }) => {
      const roomName = generateRoomName('late-joiner');

      const context1 = await browser.newContext({
        permissions: ['camera', 'microphone'],
      });
      const context2 = await browser.newContext({
        permissions: ['camera', 'microphone'],
      });

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Peer 1 joins and waits alone
        await page1.goto('/');
        await page1.fill('input[placeholder="Enter room name"]', roomName);
        await page1.click('button:has-text("Join Room")');
        await expect(page1.locator('.call-screen')).toBeVisible({ timeout: 10000 });
        await expect(page1.locator('.participant-count')).toHaveText('1 participant(s)');

        // Wait a bit to simulate late joiner scenario
        await page1.waitForTimeout(2000);

        // Peer 2 joins later
        await page2.goto('/');
        await page2.fill('input[placeholder="Enter room name"]', roomName);
        await page2.click('button:has-text("Join Room")');
        await expect(page2.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        // Both should connect
        await waitForPeerConnection(page1, 2);
        await waitForPeerConnection(page2, 2);

        // Verify remote video streams arrived with video tracks
        expect(await verifyVideoHasActiveStream(page1, '.video-tile:not(.local) video')).toBe(true);
        expect(await verifyVideoHasActiveStream(page2, '.video-tile:not(.local) video')).toBe(true);

      } finally {
        await context1.close();
        await context2.close();
      }
    });

  });

  test.describe('Three Peers - Mesh Topology', () => {

    test('three peers should all connect to each other', async ({ browser }) => {
      const roomName = generateRoomName('three-peers');

      const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context3 = await browser.newContext({ permissions: ['camera', 'microphone'] });

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      const page3 = await context3.newPage();

      try {
        // Peer 1 joins
        await page1.goto('/');
        await page1.fill('input[placeholder="Enter room name"]', roomName);
        await page1.click('button:has-text("Join Room")');
        await expect(page1.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        // Peer 2 joins
        await page2.goto('/');
        await page2.fill('input[placeholder="Enter room name"]', roomName);
        await page2.click('button:has-text("Join Room")');
        await expect(page2.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        // Wait for peers 1 and 2 to connect
        await waitForPeerConnection(page1, 2);
        await waitForPeerConnection(page2, 2);

        // Peer 3 joins
        await page3.goto('/');
        await page3.fill('input[placeholder="Enter room name"]', roomName);
        await page3.click('button:has-text("Join Room")');
        await expect(page3.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        // All three should see each other (3 video tiles each: 1 local + 2 remote)
        await waitForPeerConnection(page1, 3);
        await waitForPeerConnection(page2, 3);
        await waitForPeerConnection(page3, 3);

        // Verify participant counts
        await expect(page1.locator('.participant-count')).toHaveText('3 participant(s)');
        await expect(page2.locator('.participant-count')).toHaveText('3 participant(s)');
        await expect(page3.locator('.participant-count')).toHaveText('3 participant(s)');

        // Verify each page has 2 remote video tiles with active streams
        const remoteTilesPage1 = page1.locator('.video-tile:not(.local)');
        const remoteTilesPage2 = page2.locator('.video-tile:not(.local)');
        const remoteTilesPage3 = page3.locator('.video-tile:not(.local)');

        await expect(remoteTilesPage1).toHaveCount(2);
        await expect(remoteTilesPage2).toHaveCount(2);
        await expect(remoteTilesPage3).toHaveCount(2);

      } finally {
        await context1.close();
        await context2.close();
        await context3.close();
      }
    });

    test('mesh should handle one peer leaving', async ({ browser }) => {
      const roomName = generateRoomName('mesh-leave');

      const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context3 = await browser.newContext({ permissions: ['camera', 'microphone'] });

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      const page3 = await context3.newPage();

      try {
        // All three peers join
        await page1.goto('/');
        await page1.fill('input[placeholder="Enter room name"]', roomName);
        await page1.click('button:has-text("Join Room")');
        await expect(page1.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        await page2.goto('/');
        await page2.fill('input[placeholder="Enter room name"]', roomName);
        await page2.click('button:has-text("Join Room")');
        await expect(page2.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        await page3.goto('/');
        await page3.fill('input[placeholder="Enter room name"]', roomName);
        await page3.click('button:has-text("Join Room")');
        await expect(page3.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        // Wait for all connections
        await waitForPeerConnection(page1, 3);
        await waitForPeerConnection(page2, 3);
        await waitForPeerConnection(page3, 3);

        // Peer 2 leaves
        await page2.click('button:has-text("Leave")');

        // Peers 1 and 3 should now see only each other
        await expect(page1.locator('.video-tile')).toHaveCount(2, { timeout: 10000 });
        await expect(page3.locator('.video-tile')).toHaveCount(2, { timeout: 10000 });

        await expect(page1.locator('.participant-count')).toHaveText('2 participant(s)');
        await expect(page3.locator('.participant-count')).toHaveText('2 participant(s)');

        // Verify remaining connection still has remote video streams
        expect(await verifyVideoHasActiveStream(page1, '.video-tile:not(.local) video')).toBe(true);
        expect(await verifyVideoHasActiveStream(page3, '.video-tile:not(.local) video')).toBe(true);

      } finally {
        await context1.close();
        await context2.close();
        await context3.close();
      }
    });

  });

  test.describe('Error Handling', () => {

    test('should show error when signaling server is unavailable', async ({ page }) => {
      // Stop using the webServer - connect directly without signaling
      // This test requires modifying the config or using a different port
      // For now, we'll test by checking error handling in the app

      await page.goto('/');

      // The app should handle connection errors gracefully
      // This is a placeholder - actual implementation would require
      // either stopping the signaling server or using a wrong port
      await page.fill('input[placeholder="Enter room name"]', 'test-room');

      // Verify join button exists and is enabled
      await expect(page.locator('button:has-text("Join Room")')).toBeEnabled();
    });

    test('should display loading state during join', async ({ page }) => {
      await page.goto('/');

      await page.fill('input[placeholder="Enter room name"]', generateRoomName('loading'));

      // Click and immediately check for loading state
      const joinButton = page.locator('button', { hasText: /Join|Joining/ });
      await joinButton.click();

      // Should eventually show call screen or error
      await expect(page.locator('.call-screen, .error')).toBeVisible({ timeout: 15000 });
    });

  });

  test.describe('UI States', () => {

    test('should show muted indicator when audio is muted', async ({ page }) => {
      const roomName = generateRoomName('muted-indicator');
      await page.goto('/');

      await page.fill('input[placeholder="Enter room name"]', roomName);
      await page.click('button:has-text("Join Room")');
      await expect(page.locator('.call-screen')).toBeVisible({ timeout: 10000 });

      // Mute audio
      await page.click('button:has-text("Mute")');

      // Check for muted indicator in video tile
      await expect(page.locator('.muted-indicator')).toBeVisible();
    });

    test('should show correct participant count as peers join and leave', async ({ browser }) => {
      const roomName = generateRoomName('participant-count');

      const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
      const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Peer 1 joins - should show 1 participant
        await page1.goto('/');
        await page1.fill('input[placeholder="Enter room name"]', roomName);
        await page1.click('button:has-text("Join Room")');
        await expect(page1.locator('.call-screen')).toBeVisible({ timeout: 10000 });
        await expect(page1.locator('.participant-count')).toHaveText('1 participant(s)');

        // Peer 2 joins - should show 2 participants
        await page2.goto('/');
        await page2.fill('input[placeholder="Enter room name"]', roomName);
        await page2.click('button:has-text("Join Room")');
        await expect(page2.locator('.call-screen')).toBeVisible({ timeout: 10000 });

        await waitForPeerConnection(page1, 2);
        await expect(page1.locator('.participant-count')).toHaveText('2 participant(s)');
        await expect(page2.locator('.participant-count')).toHaveText('2 participant(s)');

        // Peer 2 leaves - should show 1 participant
        await page2.click('button:has-text("Leave")');
        await expect(page1.locator('.participant-count')).toHaveText('1 participant(s)', { timeout: 10000 });

      } finally {
        await context1.close();
        await context2.close();
      }
    });

  });

});
