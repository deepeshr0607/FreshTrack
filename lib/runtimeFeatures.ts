import { developmentToolsEnabled } from './developmentTools';

// Expo inlines public environment variables through direct property access.
export const DIAGNOSTICS_ENABLED = developmentToolsEnabled(__DEV__, process.env.EXPO_PUBLIC_ENABLE_DIAGNOSTICS);
