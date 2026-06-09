import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import base44 from '@base44/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

function readBase44AppId() {
  try {
    const raw = fs.readFileSync(path.join(root, 'base44', '.app.jsonc'), 'utf8');
    const match = raw.match(/"id"\s*:\s*"([^"]+)"/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '');
  const appId = env.VITE_BASE44_APP_ID || readBase44AppId() || '';
  const appBaseUrl = env.VITE_BASE44_APP_BASE_URL || '';

  return {
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: false,
    },
    define: {
      'import.meta.env.VITE_BASE44_APP_ID': JSON.stringify(appId),
      'import.meta.env.VITE_BASE44_APP_BASE_URL': JSON.stringify(appBaseUrl),
    },
    plugins: [
      base44({
        legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
        hmrNotifier: true,
        navigationNotifier: true,
        analyticsTracker: true,
        visualEditAgent: true,
      }),
      react(),
    ],
  };
});
