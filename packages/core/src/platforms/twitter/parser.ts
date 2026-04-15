/**
 * Twitter API response parser.
 * Ported from f2/apps/twitter/filter.py
 *
 * The Twitter API response structure is unstable:
 * - instructions array length varies (may insert TimelineClearCache etc.)
 * - Field paths change between result.tweet.legacy and result.legacy
 *
 * This parser uses dynamic lookup to handle these variations.
 */

import type { TweetData } from '../../types/index.js';

/**
 * Recursively search for a key in a nested object/array.
 */
function deepSearch(obj: unknown, targetKey: string): unknown {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    if (targetKey in obj) return (obj as Record<string, unknown>)[targetKey];
    for (const v of Object.values(obj)) {
      const found = deepSearch(v, targetKey);
      if (found !== undefined) return found;
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = deepSearch(item, targetKey);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/**
 * Get a value from an object using a dot-path.
 */
function getByPath(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Parse timestamp string from Twitter API to a readable date string.
 * Twitter format: "Mon Jan 01 12:00:00 +0000 2024"
 */
function parseTimestamp(ts: string): string {
  if (!ts || typeof ts !== 'string') return '';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return ts;
    return date.toISOString().replace('T', ' ').slice(0, 19);
  } catch {
    return ts;
  }
}

/**
 * Clean text from Twitter (remove URLs, etc.)
 */
function cleanText(text: string): string {
  if (!text) return '';
  // Remove URLs
  let cleaned = text.replace(/https?:\/\/\S+/g, '').trim();
  return cleaned;
}

/**
 * Find the instruction index that contains 'entries'.
 * Twitter API may insert TimelineClearCache before the actual data instruction.
 */
function findInstructionIndex(instructions: unknown[]): string {
  // Try [0], then [1]
  for (const idx of [0, 1]) {
    if (idx < instructions.length && 'entries' in (instructions[idx] as object)) {
      return String(idx);
    }
  }
  // Search all
  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i];
    if (inst && typeof inst === 'object' && 'entries' in inst) {
      return String(i);
    }
  }
  return '0';
}

/**
 * Get unified media info from a tweet response.
 * Uses extended_entities.media as the primary data source.
 * Returns [{ type, media_url, video_url }, ...]
 */
function getUnifiedMediaInfo(basePath: string, data: unknown): Array<{ type: string; mediaUrl: string; videoUrl: string | null }> {
  // Try multiple paths for extended_entities.media
  const mediaPaths = [
    `${basePath}.tweet.legacy.extended_entities.media`,
    `${basePath}.legacy.extended_entities.media`,
    `${basePath}.tweet.legacy.entities.media`,
    `${basePath}.legacy.entities.media`,
  ];

  let allMedia: unknown[] | undefined;
  for (const path of mediaPaths) {
    const value = getByPath(data, path);
    if (Array.isArray(value) && value.length > 0) {
      allMedia = value;
      break;
    }
  }

  if (!allMedia) {
    // Try deep search
    const deepResult = deepSearch(data, 'extended_entities');
    if (deepResult && typeof deepResult === 'object' && 'media' in (deepResult as object)) {
      allMedia = (deepResult as Record<string, unknown>).media as unknown[];
    }
  }

  if (!allMedia || !Array.isArray(allMedia)) return [];

  const results: Array<{ type: string; mediaUrl: string; videoUrl: string | null }> = [];
  for (const media of allMedia) {
    if (!media || typeof media !== 'object') continue;
    const m = media as Record<string, unknown>;

    const mediaType = (m.type as string) || 'unknown';
    const mediaUrl = (m.media_url_https as string) || (m.media_url as string) || '';

    let videoUrl: string | null = null;
    const videoInfo = m.video_info as Record<string, unknown> | undefined;
    if (videoInfo && Array.isArray(videoInfo.variants)) {
      const mp4Variants = (videoInfo.variants as Array<Record<string, unknown>>)
        .filter(v => v.content_type === 'video/mp4');
      if (mp4Variants.length > 0) {
        mp4Variants.sort((a, b) => (b.bitrate as number) - (a.bitrate as number));
        videoUrl = mp4Variants[0].url as string;
      }
    }

    results.push({ type: mediaType, mediaUrl, videoUrl });
  }

  return results;
}

/**
 * Parse a TweetDetail API response into TweetData.
 * Ported from f2 TweetDetailFilter.
 */
export function parseTweetDetail(data: unknown): TweetData | null {
  // Navigate to instructions
  const instructions = getByPath(data, 'data.threaded_conversation_with_injections_v2.instructions');
  if (!Array.isArray(instructions) || instructions.length === 0) {
    return null;
  }

  const idx = findInstructionIndex(instructions);
  const instruction = instructions[parseInt(idx)];
  const entries = (instruction as Record<string, unknown>)?.entries as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  // Base path for the tweet result
  const entry0 = entries[0];
  const tweetResults = getByPath(entry0, 'content.itemContent.tweet_results.result');
  if (!tweetResults || typeof tweetResults !== 'object') {
    return null;
  }

  const result = tweetResults as Record<string, unknown>;

  // Helper to find value trying multiple paths
  function findLegacyValue(legacyKey: string): unknown {
    const paths = [
      `tweet.legacy.${legacyKey}`,
      `legacy.${legacyKey}`,
    ];
    for (const path of paths) {
      const val = getByPath(result, path);
      if (val !== undefined) return val;
    }
    return deepSearch(result, legacyKey);
  }

  function findUserValue(userKey: string): unknown {
    const paths = [
      `tweet.core.user_results.result.${userKey}`,
      `core.user_results.result.${userKey}`,
      `tweet.core.user_results.result.legacy.${userKey}`,
      `core.user_results.result.legacy.${userKey}`,
    ];
    for (const path of paths) {
      const val = getByPath(result, path);
      if (val !== undefined) return val;
    }
    return deepSearch(result, userKey);
  }

  // Media parsing
  const mediaInfo = getUnifiedMediaInfo('data.threaded_conversation_with_injections_v2', data);
  const mediaUrls = mediaInfo.map(m => m.mediaUrl);
  const videoUrls = mediaInfo.map(m => m.videoUrl).filter(Boolean) as string[];
  const mediaTypes = mediaInfo.map(m => m.type);

  // Views count
  let viewsCount = getByPath(result, 'tweet.views.count') ?? getByPath(result, 'views.count');
  if (viewsCount === undefined) viewsCount = deepSearch(result, 'count');

  // Tweet ID
  const tweetId = (findLegacyValue('id_str') as string) || '';

  return {
    tweetId,
    tweetDesc: cleanText((findLegacyValue('full_text') as string) || ''),
    tweetDescRaw: (findLegacyValue('full_text') as string) || '',
    tweetCreatedAt: parseTimestamp((findLegacyValue('created_at') as string) || ''),
    tweetMediaType: mediaTypes.length > 0 ? (mediaTypes.length === 1 ? mediaTypes[0] : mediaTypes) : '',
    tweetMediaUrl: mediaUrls.length === 1 ? mediaUrls[0] : mediaUrls,
    tweetVideoUrl: videoUrls.length > 0 ? videoUrls[0] : null,
    tweetVideoUrls: videoUrls,
    tweetMediaTypes: mediaTypes,
    tweetViewsCount: Number(viewsCount) || 0,
    tweetFavoriteCount: Number(findLegacyValue('favorite_count') ?? 0),
    tweetReplyCount: Number(findLegacyValue('reply_count') ?? 0),
    tweetRetweetCount: Number(findLegacyValue('retweet_count') ?? 0),
    userUniqueId: (findUserValue('screen_name') as string) || '',
    nickname: (findUserValue('name') as string) || '',
    userId: (findUserValue('id_str') ?? findUserValue('rest_id') ?? '') as string,
  };
}
