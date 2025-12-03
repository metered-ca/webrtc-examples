import { IceServer } from '../types';

// Configure these values with your Metered credentials
const METERED_DOMAIN = '';
const METERED_API_KEY = '';

export async function fetchTurnCredentials(): Promise<IceServer[]> {
  const response = await fetch(
    `https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch TURN credentials');
  }

  const iceServers = await response.json();
  return iceServers;
}
