/**
 * Twitter URL parsing utilities.
 * Ported from f2/apps/twitter/utils.py
 */

const TWEET_URL_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/.*?\/status\/(\d+)/;

const UNIQUE_ID_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:@)?([a-zA-Z0-9_]+)/;

/**
 * Extract tweet ID from a URL.
 * e.g. "https://x.com/user/status/1234567890" → "1234567890"
 */
export function extractTweetId(url: string): string | null {
  const match = TWEET_URL_RE.exec(url);
  return match?.[1] ?? null;
}

/**
 * Extract user unique ID (screen name) from a URL.
 * e.g. "https://x.com/ElonMusk" → "ElonMusk"
 */
export function extractUniqueUserId(url: string): string | null {
  const match = UNIQUE_ID_RE.exec(url);
  return match?.[1] ?? null;
}

/**
 * Check if a URL is a valid Twitter URL.
 */
export function isValidTwitterUrl(url: string): boolean {
  return TWEET_URL_RE.test(url) || UNIQUE_ID_RE.test(url);
}
