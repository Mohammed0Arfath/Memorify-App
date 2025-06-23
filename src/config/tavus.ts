// Tavus API Configuration

export const TAVUS_CONFIG = {
  apiKey: import.meta.env.VITE_TAVUS_API_KEY,
  baseURL: 'https://tavusapi.com/v2',
  replicaId: import.meta.env.VITE_TAVUS_REPLICA_ID || 'r785e8c5c8', // Default replica ID
  headers: {
    'x-api-key': import.meta.env.VITE_TAVUS_API_KEY || '',
    'Content-Type': 'application/json'
  }
};

// Video generation settings
export const VIDEO_SETTINGS = {
  maxDuration: 60, // seconds
  minDuration: 30, // seconds
  defaultBackground: 'soft_gradient',
  emotionBackgrounds: {
    joy: 'sunny_meadow',
    gratitude: 'warm_sunset',
    calm: 'peaceful_lake',
    melancholy: 'gentle_rain',
    anxiety: 'soft_clouds',
    excitement: 'vibrant_energy',
    reflection: 'cozy_library',
    hope: 'dawn_sky',
    nostalgia: 'autumn_leaves',
    contentment: 'garden_path'
  },
  emotionPaces: {
    joy: 'upbeat',
    gratitude: 'warm',
    calm: 'slow',
    melancholy: 'gentle',
    anxiety: 'reassuring',
    excitement: 'energetic',
    reflection: 'thoughtful',
    hope: 'inspiring',
    nostalgia: 'nostalgic',
    contentment: 'peaceful'
  }
};

export default TAVUS_CONFIG;