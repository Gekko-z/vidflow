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
