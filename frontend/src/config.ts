/**
 * Local/dev: empty → relative paths + Vite proxy to :8000.
 * Production: VITE_API_URL, or default Render backend.
 */
const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '');

export const API_BASE =
  fromEnv ||
  (import.meta.env.PROD ? 'https://ai-agents-sber.onrender.com' : '');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
