/**
 * HTTP request options for the crawler.
 */
export interface RequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Proxy configuration, e.g. "http://127.0.0.1:7890" */
  proxy?: string;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Number of retries on failure */
  maxRetries?: number;
}

/**
 * HTTP response from the crawler.
 */
export interface Response<T = unknown> {
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Parsed JSON body */
  data: T;
  /** Raw response text */
  text: string;
}

/**
 * Platform identifier.
 */
export type Platform = 'twitter' | 'douyin' | 'tiktok' | 'weibo';

/**
 * Download task status.
 */
export type DownloadState = 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';

/**
 * A single download task.
 */
export interface DownloadTask {
  id: string;
  url: string;
  filename: string;
  savePath: string;
  state: DownloadState;
  progress: number;
  totalBytes?: number;
  downloadedBytes?: number;
  error?: string;
}

/**
 * Twitter API credentials.
 */
export interface TwitterCredentials {
  /** User login cookie string */
  cookie: string;
  /** Bearer token (Authorization header) */
  authorization: string;
  /** CSRF token (X-Csrf-Token header, equals ct0 cookie value) */
  xCsrfToken: string;
}

/**
 * A single media item from a tweet.
 */
export interface TweetMediaItem {
  type: 'video' | 'photo' | 'animated_gif' | 'unknown';
  mediaUrl: string;
  /** MP4 video URL (highest bitrate), only for video/animated_gif */
  videoUrl?: string;
}

/**
 * Parsed tweet data from Twitter API response.
 */
export interface TweetData {
  tweetId: string;
  tweetDesc: string;
  tweetDescRaw: string;
  tweetCreatedAt: string;
  tweetMediaType: string | string[];
  tweetMediaUrl: string | string[];
  tweetVideoUrl: string | null;
  tweetVideoUrls: string[];
  tweetMediaTypes: string[];
  tweetViewsCount: number;
  tweetFavoriteCount: number;
  tweetReplyCount: number;
  tweetRetweetCount: number;
  /** User */
  userUniqueId: string;
  nickname: string;
  userId: string;
}

/**
 * Twitter user profile data.
 */
export interface TwitterUserProfile {
  userId: string;
  userRestId: string;
  userUniqueId: string;
  nickname: string;
  nicknameRaw: string;
  description: string;
  followersCount: number;
  friendsCount: number;
  mediaCount: number;
  isBlueVerified: boolean;
  profileBannerUrl: string;
}
