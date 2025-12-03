// Generate a unique meeting ID
export function generateMeetingId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const segments = [4, 4, 4]; // Format: xxxx-xxxx-xxxx

  return segments
    .map((length) =>
      Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    )
    .join('-');
}

// Parse the current hash route
export function parseRoute(): { view: 'home' | 'meeting'; meetingId?: string } {
  const hash = window.location.hash.slice(1); // Remove #

  if (!hash || hash === '/') {
    return { view: 'home' };
  }

  const meetingMatch = hash.match(/^\/meeting\/([a-z0-9-]+)$/);
  if (meetingMatch) {
    return { view: 'meeting', meetingId: meetingMatch[1] };
  }

  return { view: 'home' };
}

// Navigate to a route
export function navigateTo(path: string): void {
  window.location.hash = path;
}

// Navigate to home
export function navigateToHome(): void {
  navigateTo('/');
}

// Navigate to meeting
export function navigateToMeeting(meetingId: string): void {
  navigateTo(`/meeting/${meetingId}`);
}

// Get the full meeting URL for sharing
export function getMeetingUrl(meetingId: string): string {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#/meeting/${meetingId}`;
}

// Generate a unique peer ID
export function generatePeerId(): string {
  return Math.random().toString(36).substring(2, 15);
}
