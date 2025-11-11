export type OAuthProvider = 'GOOGLE' | 'APPLE';

export function requestIdToken(provider: OAuthProvider): string | null {
  if (typeof window === 'undefined') return null;

  const presets = (window as any).__oauthTokens;
  const key = provider === 'GOOGLE' ? 'google' : 'apple';
  if (presets && typeof presets === 'object') {
    const candidate = presets[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  if (typeof window.prompt === 'function') {
    const label = provider === 'GOOGLE' ? 'Google' : 'Apple';
    const input = window.prompt(`Enter ${label} ID token`);
    if (typeof input === 'string' && input.trim().length > 0) {
      return input.trim();
    }
  }

  return null;
}
