import { app, BrowserWindow, session, ipcMain } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { downloadFile } from '@vidflow/core';
import {
  extractTweetId,
  TwitterCrawler,
  parseTweetDetail,
} from '@vidflow/core';

let mainWindow: BrowserWindow | null = null;
let loginWindow: BrowserWindow | null = null;

// Stored credentials after login
let twitterCredentials: {
  cookie: string;
  authorization: string;
  xCsrfToken: string;
} | null = null;

/**
 * Twitter Bearer token (Authorization header value).
 * This is the public client bearer token used by Twitter's web interface.
 */
const TWITTER_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createLoginWindow() {
  if (loginWindow) {
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    width: 600,
    height: 700,
    title: 'Login to Twitter/X',
    webPreferences: {
      partition: 'persist:twitter-login',
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  loginWindow.loadURL('https://x.com/i/flow/login');

  // Monitor navigation to detect successful login
  loginWindow.webContents.on('did-navigate', async (_event, url) => {
    // If user navigated away from login page, they're likely logged in
    if (!url.includes('/i/flow/login') && !url.includes('/home')) {
      await extractAndStoreCookies();
    }
  });

  loginWindow.webContents.on('did-navigate-in-page', async (_event, url) => {
    // User reached home feed, login successful
    if (url.includes('/home') || url === 'https://x.com/home') {
      await extractAndStoreCookies();
    }
  });

  loginWindow.on('closed', () => {
    loginWindow = null;
  });
}

async function extractAndStoreCookies() {
  const twitterSession = session.fromPartition('persist:twitter-login');

  const cookies = await twitterSession.cookies.get({ domain: '.x.com' });
  const cookieStr = cookies
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  // ct0 is the X-Csrf-Token
  const ct0Cookie = cookies.find((c) => c.name === 'ct0');
  const xCsrfToken = ct0Cookie?.value || '';

  // Check if we actually have auth_token (means logged in)
  const authCookie = cookies.find((c) => c.name === 'auth_token');
  if (!authCookie) {
    return; // Not logged in yet
  }

  twitterCredentials = {
    cookie: cookieStr,
    authorization: TWITTER_BEARER,
    xCsrfToken,
  };

  // Close login window
  if (loginWindow) {
    loginWindow.close();
    loginWindow = null;
  }

  // Notify main window
  if (mainWindow) {
    mainWindow.webContents.send('login-success', {
      cookie: cookieStr,
      xCsrfToken,
    });
  }
}

/**
 * Get cookies for a specific domain from the Electron session.
 */
export async function getCookiesForDomain(domain: string): Promise<string> {
  const cookies = await session.defaultSession.cookies.get({ domain });
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

/**
 * Handle download task from renderer.
 */
async function handleDownload(url: string, saveDir: string) {
  if (!twitterCredentials) {
    return { success: false, message: 'Not logged in to Twitter' };
  }

  const log = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const line = `[${timestamp}] ${msg}`;
    console.log(line);
    if (mainWindow) {
      mainWindow.webContents.send('log', line);
    }
  };

  log('auth_token present: ' + twitterCredentials.cookie.includes('auth_token'));
  log('ct0 present: ' + !!twitterCredentials.xCsrfToken);
  log('cookie length: ' + twitterCredentials.cookie.length);
  log('authorization: ' + twitterCredentials.authorization.slice(0, 30) + '...');

  const tweetId = extractTweetId(url);
  if (!tweetId) {
    return { success: false, message: 'Invalid Twitter URL' };
  }
  log('tweetId: ' + tweetId);

  try {
    // First, do a direct fetch to debug the 403
    const baseUrl = `https://x.com/i/api/graphql/nBS-WpgA6ZG0CyNHD517JQ/TweetDetail`;
    const params = new URLSearchParams({
      variables: JSON.stringify({
        focalTweetId: tweetId,
        with_rux_injections: true,
        includePromotedContent: true,
        withCommunity: true,
        withQuickPromoteEligibilityTweetFields: true,
        withBirdwatchNotes: true,
        withVoice: true,
        rankingMode: 'Relevance',
        referrer: 'tweet',
        controller_data: 'DAACDAABDAABCgABAAAAAAAAAAAKAAgMseIsK1XAAAAAAAA=',
      }),
      features: JSON.stringify({
        articles_preview_enabled: true,
        c9s_tweet_anatomy_moderator_badge_enabled: true,
        communities_web_enable_tweet_community_results_fetch: true,
        creator_subscriptions_quote_tweet_preview_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        freedom_of_speech_not_reach_fetch_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        longform_notetweets_consumption_enabled: true,
        longform_notetweets_inline_media_enabled: true,
        longform_notetweets_rich_text_read_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        responsive_web_enhance_cards_enabled: false,
        responsive_web_graphql_exclude_directive_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_twitter_article_tweet_consumption_enabled: true,
        rweb_tipjar_consumption_enabled: true,
        rweb_video_timestamps_enabled: true,
        standardized_nudges_misinfo: true,
        tweet_awards_web_tipping_enabled: false,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        tweet_with_visibility_results_prefer_gql_media_interstitial_enabled: true,
        tweetypie_unmention_optimization_enabled: true,
        verified_phone_label_enabled: false,
        view_counts_everywhere_api_enabled: true,
      }),
      fieldToggles: JSON.stringify({
        withArticlePlainText: false,
        withArticleRichContentState: true,
        withDisallowedReplyControls: false,
        withGrokAnalyze: false,
      }),
    });
    const debugUrl = `${baseUrl}?${params}`;

    log('--- Direct fetch debug ---');
    log('URL: ' + debugUrl.slice(0, 200) + '...');

    const testResponse = await fetch(debugUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Referer': 'https://x.com/',
        'Accept': '*/*',
        'Cookie': twitterCredentials.cookie,
        'Authorization': twitterCredentials.authorization,
        'X-Csrf-Token': twitterCredentials.xCsrfToken,
      },
    });
    log('Direct fetch status: ' + testResponse.status + ' ' + testResponse.statusText);
    const testBody = await testResponse.text();
    if (!testResponse.ok) {
      log('Direct fetch error body: ' + testBody);
    } else {
      log('Direct fetch OK, body length: ' + testBody.length);
      log('Direct fetch body preview: ' + testBody.slice(0, 300));
    }
    log('--- End direct fetch debug ---');

    // Now proceed with the crawler
    const crawler = new TwitterCrawler(twitterCredentials);
    log('Fetching tweet detail via crawler...');
    const rawData = await crawler.fetchTweetDetail(tweetId);
    log('Crawler response: ' + JSON.stringify(rawData).slice(0, 500));
    const tweetData = parseTweetDetail(rawData);

    if (!tweetData) {
      return { success: false, message: 'Failed to parse tweet data' };
    }

    // Download videos
    const videoUrls = tweetData.tweetVideoUrls.length > 0
      ? tweetData.tweetVideoUrls
      : (tweetData.tweetVideoUrl ? [tweetData.tweetVideoUrl] : []);

    if (videoUrls.length > 0) {
      const baseName = `${tweetData.tweetId}_${tweetData.nickname}`;
      for (let i = 0; i < videoUrls.length; i++) {
        const videoUrl = videoUrls[i];
        const suffix = videoUrls.length > 1 ? `_video_${i + 1}` : '_video';
        const dest = path.join(saveDir, `${baseName}${suffix}.mp4`);

        await downloadFile(videoUrl, dest, {
          onProgress: (downloaded, total) => {
            const progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
            if (mainWindow) {
              mainWindow.webContents.send('download-progress', {
                filename: path.basename(dest),
                progress,
                state: 'downloading',
              });
            }
          },
        });

        if (mainWindow) {
          mainWindow.webContents.send('download-progress', {
            filename: path.basename(dest),
            progress: 100,
            state: 'completed',
          });
        }
      }
    }

    // Download images
    const mediaUrls = Array.isArray(tweetData.tweetMediaUrl)
      ? tweetData.tweetMediaUrl
      : [tweetData.tweetMediaUrl];

    // Filter out video cover images
    const videoCoverIndices = new Set<number>();
    if (Array.isArray(tweetData.tweetMediaTypes)) {
      tweetData.tweetMediaTypes.forEach((type, idx) => {
        if (type === 'video' || type === 'animated_gif') {
          videoCoverIndices.add(idx);
        }
      });
    }

    const baseName = `${tweetData.tweetId}_${tweetData.nickname}`;
    for (let i = 0; i < mediaUrls.length; i++) {
      if (videoCoverIndices.has(i)) continue;
      if (!mediaUrls[i]) continue;

      const imageUrl = `${mediaUrls[i]}?format=jpg&name=large`;
      const dest = path.join(saveDir, `${baseName}_image_${i + 1}.jpg`);

      await downloadFile(imageUrl, dest, {
        onProgress: (downloaded, total) => {
          const progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
          if (mainWindow) {
            mainWindow.webContents.send('download-progress', {
              filename: path.basename(dest),
              progress,
              state: 'downloading',
            });
          }
        },
      });

      if (mainWindow) {
        mainWindow.webContents.send('download-progress', {
          filename: path.basename(dest),
          progress: 100,
          state: 'completed',
        });
      }
    }

    // Save tweet description
    if (tweetData.tweetDescRaw) {
      const dest = path.join(saveDir, `${baseName}_desc.txt`);
      await fs.writeFile(dest, tweetData.tweetDescRaw, 'utf-8');
    }

    return { success: true, message: 'Download completed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', {
        filename: '',
        progress: 0,
        state: 'failed',
        error: message,
      });
    }
    return { success: false, message };
  }
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-cookies', async (_event, domain: string) => {
  try {
    return await getCookiesForDomain(domain);
  } catch {
    return '';
  }
});

ipcMain.handle('download', async (_event, task: { url: string; saveDir: string }) => {
  return handleDownload(task.url, task.saveDir);
});

ipcMain.handle('open-login-window', async () => {
  createLoginWindow();
  return { success: true };
});

ipcMain.handle('check-login-status', async () => {
  return {
    isLoggedIn: !!twitterCredentials,
  };
});

ipcMain.handle('get-credentials-info', async () => {
  if (!twitterCredentials) {
    return { isLoggedIn: false };
  }
  // Show cookie names and auth_token preview for debugging
  const cookieParts = twitterCredentials.cookie.split('; ');
  const cookieNames = cookieParts.map(p => p.split('=')[0]).filter(Boolean);
  const authToken = cookieParts.find(p => p.startsWith('auth_token='))?.slice(11, 30) + '...';
  return {
    isLoggedIn: true,
    cookieNames,
    auth_token_preview: authToken || '(not found)',
    ct0_preview: twitterCredentials.xCsrfToken.slice(0, 20) + '...',
    cookie_length: twitterCredentials.cookie.length,
  };
});

ipcMain.handle('get-full-cookies', async () => {
  if (!twitterCredentials) {
    return { isLoggedIn: false, cookie: '', xCsrfToken: '', authorization: '' };
  }
  return {
    isLoggedIn: true,
    cookie: twitterCredentials.cookie,
    xCsrfToken: twitterCredentials.xCsrfToken,
    authorization: twitterCredentials.authorization,
  };
});
