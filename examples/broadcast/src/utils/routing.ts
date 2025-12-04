export function generateBroadcastId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function getBroadcastIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('b');
}

export function navigateToBroadcaster(broadcastId: string): void {
  window.history.pushState({}, '', `?role=broadcaster&b=${broadcastId}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function navigateToViewer(broadcastId: string): void {
  window.history.pushState({}, '', `?role=viewer&b=${broadcastId}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function navigateHome(): void {
  window.history.pushState({}, '', window.location.pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function getRoleFromUrl(): 'broadcaster' | 'viewer' | null {
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role');
  if (role === 'broadcaster' || role === 'viewer') {
    return role;
  }
  return null;
}
