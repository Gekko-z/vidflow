import { useState, useEffect, useCallback } from 'react';

interface DownloadItem {
  filename: string;
  progress: number;
  state: 'downloading' | 'completed' | 'failed';
  error?: string;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [url, setUrl] = useState('');
  const [saveDir, setSaveDir] = useState('/Users/gekko/Downloads');
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [credentialsInfo, setCredentialsInfo] = useState<Record<string, string> | null>(null);
  const [fullCookies, setFullCookies] = useState<{ cookie: string; xCsrfToken: string; authorization: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    window.electronAPI.checkLoginStatus().then(({ isLoggedIn }) => {
      setIsLoggedIn(isLoggedIn);
      if (isLoggedIn) {
        window.electronAPI.getCredentialsInfo().then((info) => {
          setCredentialsInfo(info as unknown as Record<string, string>);
        });
      }
    });

    window.electronAPI.onLoginSuccess(() => {
      setIsLoggedIn(true);
      window.electronAPI.getCredentialsInfo().then((info) => {
        setCredentialsInfo(info as unknown as Record<string, string>);
      });
    });

    window.electronAPI.onDownloadProgress((data) => {
      setDownloads((prev) => {
        const existing = prev.findIndex((d) => d.filename === data.filename);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = {
            filename: data.filename,
            progress: data.progress,
            state: data.state as DownloadItem['state'],
            error: data.error,
          };
          return updated;
        }
        if (data.state !== 'completed') {
          return [
            ...prev,
            {
              filename: data.filename,
              progress: data.progress,
              state: data.state as DownloadItem['state'],
              error: data.error,
            },
          ];
        }
        return prev;
      });

      // Auto-remove completed items after a moment
      if (data.state === 'completed' || data.state === 'failed') {
        setIsDownloading(false);
      }
    });

    // Log listener
    window.electronAPI.onLog((msg) => {
      setLogs((prev) => [...prev, msg]);
    });
  }, []);

  const handleLogin = useCallback(async () => {
    await window.electronAPI.openLoginWindow();
  }, []);

  const handleDownload = useCallback(async () => {
    if (!url.trim() || !saveDir) return;
    setIsDownloading(true);
    setDownloads([]);
    const result = await window.electronAPI.download({
      url: url.trim(),
      saveDir,
    });
    if (!result.success) {
      setDownloads((prev) => [
        ...prev,
        { filename: 'Error', progress: 0, state: 'failed', error: result.message },
      ]);
      setIsDownloading(false);
    }
  }, [url, saveDir]);

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>VidFlow</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Cross-platform video downloader</p>

      {/* Login status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          marginBottom: 20,
          background: isLoggedIn ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${isLoggedIn ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>
          {isLoggedIn ? '✅ Logged in to Twitter/X' : 'Not logged in'}
        </span>
        {!isLoggedIn && (
          <button
            onClick={handleLogin}
            style={{
              padding: '6px 16px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Login
          </button>
        )}
        <button
          onClick={() => {
            setShowDebug((v) => !v);
            window.electronAPI.getCredentialsInfo().then((info) => {
              setCredentialsInfo(info as unknown as Record<string, string>);
            });
            window.electronAPI.getFullCookies().then((info) => {
              if (info.isLoggedIn) {
                setFullCookies({
                  cookie: info.cookie || '',
                  xCsrfToken: info.xCsrfToken || '',
                  authorization: info.authorization || '',
                });
              }
            });
          }}
          style={{
            padding: '6px 16px',
            background: showDebug ? '#f59e0b' : '#6b7280',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            marginLeft: 'auto',
          }}
        >
          {showDebug ? 'Hide Debug' : 'Debug'}
        </button>
      </div>

      {/* Cookie debug info */}
      {showDebug && credentialsInfo && (
        <div
          style={{
            padding: 12,
            marginBottom: 20,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'monospace',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
            Cookie Debug
          </div>
          <div>Cookies: {credentialsInfo.cookie_length || 0} bytes</div>
          <div>auth_token: {credentialsInfo.auth_token_preview || '(not found)'}</div>
          <div>ct0 (X-Csrf-Token): {credentialsInfo.ct0_preview || '(not found)'}</div>
          <div style={{ marginTop: 4, wordBreak: 'break-all' }}>
            Cookie names: {(credentialsInfo.cookieNames as string[] | undefined)?.join(', ') || 'N/A'}
          </div>
          {fullCookies && (
            <>
              <div style={{ marginTop: 8, fontWeight: 600, fontSize: 13 }}>
                Full Cookie (copy to compare with browser):
              </div>
              <div
                style={{
                  marginTop: 4,
                  padding: 8,
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  maxHeight: 150,
                  overflow: 'auto',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                  fontSize: 11,
                  userSelect: 'all',
                }}
              >
                {fullCookies.cookie}
              </div>
              <div style={{ marginTop: 8, fontWeight: 600, fontSize: 13 }}>
                X-Csrf-Token (ct0):
              </div>
              <div
                style={{
                  marginTop: 4,
                  padding: 8,
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  wordBreak: 'break-all',
                  userSelect: 'all',
                }}
              >
                {fullCookies.xCsrfToken}
              </div>
              <div style={{ marginTop: 8, fontWeight: 600, fontSize: 13 }}>
                Authorization (Bearer token):
              </div>
              <div
                style={{
                  marginTop: 4,
                  padding: 8,
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  wordBreak: 'break-all',
                  userSelect: 'all',
                }}
              >
                {fullCookies.authorization}
              </div>
            </>
          )}
        </div>
      )}

      {/* URL input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste tweet URL (e.g. https://x.com/user/status/1234567890)"
          disabled={!isLoggedIn || isDownloading}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          onClick={handleDownload}
          disabled={!isLoggedIn || !url.trim() || isDownloading}
          style={{
            padding: '10px 20px',
            background: isLoggedIn && url.trim() && !isDownloading ? '#2563eb' : '#9ca3af',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: isLoggedIn && url.trim() && !isDownloading ? 'pointer' : 'not-allowed',
            fontSize: 14,
            whiteSpace: 'nowrap',
          }}
        >
          {isDownloading ? 'Downloading...' : 'Download'}
        </button>
      </div>

      {/* Save directory */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>
          Save to:
        </label>
        <input
          type="text"
          value={saveDir}
          onChange={(e) => setSaveDir(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      </div>

      {/* Download list */}
      {downloads.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Downloads</h3>
          {downloads.map((item, i) => (
            <div
              key={i}
              style={{
                padding: 10,
                marginBottom: 6,
                background: item.state === 'completed'
                  ? '#f0fdf4'
                  : item.state === 'failed'
                    ? '#fef2f2'
                    : '#f9fafb',
                border: `1px solid ${
                  item.state === 'completed'
                    ? '#bbf7d0'
                    : item.state === 'failed'
                      ? '#fecaca'
                      : '#e5e7eb'
                }`,
                borderRadius: 6,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500 }}>{item.filename}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: '#e5e7eb',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${item.progress}%`,
                      height: '100%',
                      background: item.state === 'failed' ? '#ef4444' : '#2563eb',
                      transition: 'width 0.2s',
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, color: '#6b7280', minWidth: 40 }}>
                  {item.state === 'completed'
                    ? 'Done'
                    : item.state === 'failed'
                      ? `Failed: ${item.error}`
                      : `${item.progress}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log panel */}
      {logs.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Logs</h3>
          <div
            style={{
              padding: 12,
              background: '#1e1e1e',
              color: '#d4d4d4',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 11,
              maxHeight: 300,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {logs.map((log, i) => (
              <div key={i} style={{ lineHeight: 1.6 }}>
                {log.includes('error') || log.includes('Error') || log.includes('403')
                  ? `\x1b[31m${log}\x1b[0m`
                  : log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
