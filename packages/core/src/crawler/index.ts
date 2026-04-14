import type { RequestOptions, Response } from '../types/index.js';

/**
 * Default request options.
 */
const DEFAULT_OPTIONS: Required<RequestOptions> = {
  timeout: 10_000,
  proxy: '',
  headers: {},
  maxRetries: 5,
};

/**
 * HTTP client for making requests to platform APIs.
 *
 * Inspired by f2's `BaseCrawler` but built on native fetch.
 */
export class HttpClient {
  private readonly defaults: Required<RequestOptions>;

  constructor(options: RequestOptions = {}) {
    this.defaults = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Send a GET request and return parsed JSON response.
   */
  async get<T = unknown>(url: string, options: RequestOptions = {}): Promise<Response<T>> {
    const opts = this.mergeOptions(options);
    return this.request<T>('GET', url, opts);
  }

  /**
   * Send a POST request with JSON body and return parsed JSON response.
   */
  async post<T = unknown>(
    url: string,
    body?: Record<string, unknown>,
    options: RequestOptions = {},
  ): Promise<Response<T>> {
    const opts = this.mergeOptions(options);
    return this.request<T>('POST', url, {
      ...opts,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Send a HEAD request.
   */
  async head(url: string, options: RequestOptions = {}): Promise<Response> {
    const opts = this.mergeOptions(options);
    return this.request('HEAD', url, opts);
  }

  /**
   * Internal request method with retry logic.
   */
  private async request<T>(
    method: string,
    url: string,
    options: Required<RequestOptions> & { body?: string },
  ): Promise<Response<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < options.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);

        const fetchInit: RequestInit = {
          method,
          headers: this.buildHeaders(options),
          signal: controller.signal,
          redirect: 'follow',
        };

        if (options.body) {
          fetchInit.body = options.body;
        }

        // Note: native fetch doesn't support proxy directly in Node.js
        // Proxy support requires a custom agent (see TODO below)
        const response = await fetch(url, fetchInit);
        clearTimeout(timeoutId);

        const text = await response.text();
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        if (!response.ok) {
          throw new HttpError(response.status, response.statusText, url);
        }

        let data: T = {} as T;
        if (text && this.isJsonContentType(headers)) {
          data = JSON.parse(text) as T;
        }

        return {
          status: response.status,
          headers,
          data,
          text,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < options.maxRetries - 1) {
          await this.sleep(options.timeout / 10);
        }
      }
    }

    throw new Error(
      `Request failed after ${options.maxRetries} retries: ${lastError?.message}`,
    );
  }

  private buildHeaders(options: Required<RequestOptions>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ...options.headers,
    };
  }

  private isJsonContentType(headers: Record<string, string>): boolean {
    const contentType = headers['content-type'] ?? '';
    return contentType.includes('application/json');
  }

  private mergeOptions(options: RequestOptions): Required<RequestOptions> {
    return { ...this.defaults, ...options };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a new HttpClient with merged options.
   */
  withOptions(options: RequestOptions): HttpClient {
    return new HttpClient({ ...this.defaults, ...options });
  }
}

/**
 * HTTP error with status code and URL context.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly url: string,
  ) {
    super(`HTTP ${status} ${statusText} for ${url}`);
    this.name = 'HttpError';
  }
}
