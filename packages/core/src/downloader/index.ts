import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface DownloadOptions {
  onProgress?: (downloaded: number, total: number) => void;
  signal?: AbortSignal;
}

/**
 * Download a file from a URL with progress tracking and resume support.
 */
export async function downloadFile(
  url: string,
  dest: string,
  options: DownloadOptions = {},
): Promise<void> {
  const dir = path.dirname(dest);
  await fs.mkdir(dir, { recursive: true });

  let downloadedBytes = 0;
  let totalBytes = 0;

  // Check for partial download to resume
  let fileHandle: fs.FileHandle | null = null;
  try {
    const stat = await fs.stat(dest);
    downloadedBytes = stat.size;
  } catch {
    // File doesn't exist, start from 0
  }

  const headers: Record<string, string> = {};
  if (downloadedBytes > 0) {
    headers['Range'] = `bytes=${downloadedBytes}-`;
  }

  const response = await fetch(url, {
    headers,
    signal: options.signal,
  });

  if (!response.ok) {
    // If resume failed (e.g. server doesn't support Range), start over
    if (response.status === 416 && downloadedBytes > 0) {
      downloadedBytes = 0;
      const retryResponse = await fetch(url, { signal: options.signal });
      if (!retryResponse.ok) {
        throw new Error(`Failed to download ${url}: ${retryResponse.status} ${retryResponse.statusText}`);
      }
      await downloadStream(retryResponse, dest, 0, options);
      return;
    }
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  totalBytes = contentLength ? parseInt(contentLength, 10) + downloadedBytes : 0;

  await downloadStream(response, dest, downloadedBytes, options, totalBytes);
}

async function downloadStream(
  response: Response,
  dest: string,
  initialBytes: number,
  options: DownloadOptions,
  totalBytes: number = 0,
): Promise<void> {
  const body = response.body;
  if (!body) {
    throw new Error('Response body is null');
  }

  const fileHandle = await fs.open(dest, initialBytes > 0 ? 'a' : 'w');
  let downloadedBytes = initialBytes;

  try {
    const reader = body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      await fileHandle.write(value);
      downloadedBytes += value.byteLength;

      if (options.onProgress && totalBytes > 0) {
        options.onProgress(downloadedBytes, totalBytes);
      }
    }
  } finally {
    await fileHandle.close();
  }
}

/**
 * Download multiple files in parallel with concurrency limit.
 */
export async function downloadBatch(
  urls: string[],
  destDir: string,
  options: DownloadOptions = {},
  concurrency = 3,
): Promise<void[]> {
  const results: Promise<void>[] = [];
  let active = 0;
  let index = 0;

  return new Promise((resolve) => {
    function next() {
      while (active < concurrency && index < urls.length) {
        const currentIndex = index++;
        active++;
        const url = urls[currentIndex];
        const filename = url.split('/').pop() || `file_${currentIndex}`;
        const dest = path.join(destDir, filename);

        results.push(
          downloadFile(url, dest, options).finally(() => {
            active--;
            next();
          }),
        );
      }
      if (active === 0) {
        resolve(Promise.all(results));
      }
    }
    next();
  });
}
