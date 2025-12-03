import type { IceServer } from '../types';

// Configure these with your Metered domain and API key
const METERED_DOMAIN = '';
const METERED_API_KEY = '';

export async function fetchTurnCredentials(): Promise<IceServer[]> {
  if (!METERED_DOMAIN || !METERED_API_KEY) {
    console.warn('Metered credentials not configured, using STUN only');
    return [{ urls: 'stun:stun.metered.ca:80' }];
  }

  try {
    const response = await fetch(
      `https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch TURN credentials');
    }

    const iceServers = await response.json();
    return iceServers;
  } catch (error) {
    console.error('Error fetching TURN credentials:', error);
    // Fallback to STUN only
    return [{ urls: 'stun:stun.metered.ca:80' }];
  }
}
