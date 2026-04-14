# VidFlow

> A cross-platform video downloader built with TypeScript & Electron for Douyin, TikTok, Twitter/X, Weibo and more.

## Overview

VidFlow is a TypeScript reimagining of the [f2](https://github.com/Johnserf-Seed/f2) project — a Python-based multi-platform video downloader. By migrating to TypeScript and Electron, VidFlow aims to deliver:

- **Better cross-platform compatibility** — Native builds for macOS, Windows, and Linux
- **GUI client** — User-friendly desktop application powered by Electron
- **Automatic cookie acquisition** — Log in via embedded WebView, cookies are captured automatically from the Electron session
- **Type-safe API definitions** — Full TypeScript type coverage for all platform endpoints
- **Native signature computation** — X-Bogus / A-Bogus algorithms run directly in JS/TS without `PyExecJS` overhead

## Supported Platforms

| Platform    | Status      |
|-------------|-------------|
| DouYin      | Planned     |
| TikTok      | Planned     |
| Twitter / X | Planned     |
| WeiBo       | Planned     |
| BiliBili    | Future      |
| NetEaseMusic| Future      |

## Planned Features

- User profile, posts, likes, collections, playlists download
- Live stream recording (FLV / m3u8)
- Live danmaku (bullet comments) forwarding
- Batch download with date range filtering
- Custom filename templates
- Cookie auto-refresh via embedded browser login
- Proxy support (HTTP / SOCKS5)

## Project Structure

```
vidflow/
├── packages/
│   ├── core/          # Core SDK (platform-agnostic, publishable to npm)
│   ├── cli/           # CLI tool built on commander
│   └── electron/      # Electron GUI application
├── docs/              # Documentation
└── scripts/           # Build & release scripts
```

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **CLI**: Commander + Ora
- **GUI**: Electron + React
- **HTTP Client**: Undici / fetch
- **WebSocket**: ws
- **Protobuf**: protobufjs
- **Encryption**: Node.js crypto (AES, RSA, SM4 via gm-crypto)
- **Database**: better-sqlite3
- **Cookie Auth**: Electron session.cookies API
- **Build**: tsup / Vite

## Development Status

**Planning phase** — See [DEVELOPMENT.md](./DEVELOPMENT.md) for the full development plan.

## License

Apache-2.0

## Disclaimer

- This project is for learning and research purposes only.
- Please comply with爬虫 best practices and do not use for any illegal activities.
- Do not sell, share, or distribute any personal information obtained through this tool.
- Users bear all risks associated with using this software.
