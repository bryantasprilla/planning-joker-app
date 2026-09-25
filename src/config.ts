const env = import.meta.env;

export const useEmulators = env.VITE_USE_EMULATORS === 'true';

export const isConfigured =
  useEmulators || Boolean(env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_API_KEY);
