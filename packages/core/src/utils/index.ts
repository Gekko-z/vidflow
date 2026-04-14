/**
 * Extract valid URLs from a string or array of strings.
 */
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/g;

export function extractValidUrls(
  input: string | string[],
): string[] {
  if (typeof input === 'string') {
    return input.match(URL_PATTERN) ?? [];
  }
  return input.flatMap((s) => s.match(URL_PATTERN) ?? []);
}

/**
 * Generate a random alphanumeric string of given length.
 */
export function genRandomStr(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Get current UTC timestamp in milliseconds.
 */
export function getTimestamp(unit: 'milli' | 'sec' | 'min' = 'milli'): number {
  const now = Date.now();
  switch (unit) {
    case 'milli': return now;
    case 'sec': return Math.floor(now / 1000);
    case 'min': return Math.floor(now / 60000);
  }
}

/**
 * Split Set-Cookie header string into a single cookie string.
 */
export function splitSetCookie(cookieStr: string): string {
  return cookieStr
    .split(/,\s(?=[a-zA-Z])/)
    .map((c) => c.split(';')[0])
    .join(';');
}

/**
 * Convert a cookie object to a cookie string.
 */
export function cookieToString(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

/**
 * Ensure a path is absolute and resolve it.
 */
export function ensurePath(p: string): string {
  return p.startsWith('/') ? p : `${process.cwd()}/${p}`;
}

/**
 * Replace invalid filename characters with underscore.
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9#]/g, '_');
}

/**
 * Sleep for given milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
