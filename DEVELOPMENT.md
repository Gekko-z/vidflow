# VidFlow 开发计划

## 项目背景

[f2](https://github.com/Johnserf-Seed/f2) 是一个基于 Python 的多平台视频下载工具，支持抖音、TikTok、Twitter/X、微博等平台。项目架构清晰但存在以下局限：

1. **跨平台分发困难** — Python 依赖需要用户安装运行时环境
2. **Cookie 获取不便** — 依赖 `browser_cookie3` 读取浏览器加密数据库，且 Chromium V20 加密后兼容性差
3. **签名算法隔阂** — X-Bogus / A-Bogus 本身是 JS 算法，通过 `PyExecJS` 在 Python 中调用，多了一层开销
4. **无 GUI** — 仅支持命令行，对普通用户不友好
5. **API 变化响应慢** — Python 环境下难以直观观测平台 API 的调用过程

**VidFlow** 选择 TypeScript + Electron 作为目标技术栈，从根本上解决这些问题。

---

## 项目目标

### 目标一：f2 的 TypeScript 移植

将 f2 的核心功能从 Python 完整迁移到 TypeScript，实现：
- **跨平台运行** — 可在 Node.js 环境（macOS/Windows/Linux）和浏览器环境中运行
- **语言统一** — X-Bogus / A-Bogus 等签名算法本身就是 JS，迁移后原生运行，无需 `PyExecJS` 中间层
- **类型安全** — TypeScript 类型系统替代 Python Pydantic，接口定义更清晰
- **模块化架构** — core SDK 可独立发布为 npm 包，供其他项目引用

### 目标二：Electron 跨平台 GUI + Cookie 自动获取

通过 Electron 框架开发桌面客户端，实现：
- **一键登录** — 内嵌 WebView 让用户直接登录各平台，无需手动复制 Cookie
- **自动提取** — Electron `session.cookies` API 自动获取 Cookie 并注入 SDK
- **跨平台打包** — 一次开发，同时支持 macOS、Windows、Linux
- **降低门槛** — GUI 让普通用户无需命令行即可使用

### 目标三：快速响应平台 API 变化

利用 Electron 的开发者工具优势：
- **内嵌 DevTools** — 直接在 WebView 的 Network 面板观测平台 API 的请求/响应变化
- **快速调试** — 签名算法在 TS 中原生运行，无需跨语言调试，改完即测
- **快速更新** — 发现 API 变化后，直接在 core SDK 中修改对应模块，Electron 热重载验证

---

## 技术选型

| 领域       | Python (f2)         | TypeScript (VidFlow)     |
|------------|---------------------|--------------------------|
| 语言       | Python 3.10+        | TypeScript 5.x           |
| HTTP 客户端| httpx (async)       | Undici / native fetch    |
| WebSocket  | websockets + proxy  | ws                       |
| 数据模型   | Pydantic            | Zod + TypeScript 类型    |
| Protobuf   | protobuf            | protobufjs               |
| 加密       | cryptography/gmssl  | Node.js crypto/gm-crypto |
| 签名算法   | PyExecJS 执行 JS    | 原生 TS 实现             |
| 下载器     | aiofiles + m3u8     | fs.promises + m3u8-parser|
| 数据库     | aiosqlite           | better-sqlite3           |
| CLI        | click + rich        | commander + ora/ink      |
| GUI        | 无                  | Electron + React         |
| Cookie     | browser_cookie3     | Electron session.cookies |
| 构建       | hatchling           | tsup / Vite              |
| 包管理     | pip                 | pnpm (monorepo)          |

---

## 架构设计

```
┌─────────────────────────────────────────────────┐
│                  Electron App                   │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │   React UI  │  │   Embedded WebView       │  │
│  │  (Renderer) │  │   (Login & Cookie Auth)  │  │
│  └──────┬──────┘  └────────────┬─────────────┘  │
│         │                      │                │
│  ┌──────┴──────────────────────┴──────────────┐  │
│  │            Electron Main Process            │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │    session.cookies.get() → Cookie    │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  └─────────────────────┬──────────────────────┘  │
└────────────────────────┼─────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │    @vidflow/core    │
              │  (Platform SDK)     │
              │                     │
              │  ┌───────────────┐  │
              │  │  Platform API │  │
              │  │  (Twitter,    │  │
              │  │   DouYin,     │  │
              │  │   TikTok,     │  │
              │  │   Weibo)      │  │
              │  └───────┬───────┘  │
              │          │          │
              │  ┌───────▼───────┐  │
              │  │  Crawler      │  │
              │  │  (HTTP/WSS)   │  │
              │  └───────┬───────┘  │
              │          │          │
              │  ┌───────▼───────┐  │
              │  │  Downloader   │  │
              │  │  (file/m3u8)  │  │
              │  └───────┬───────┘  │
              │          │          │
              │  ┌───────▼───────┐  │
              │  │  Signature    │  │
              │  │  (XB/ABogus)  │  │
              │  └───────────────┘  │
              └─────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   @vidflow/cli      │
              │  (Command-line UI)  │
              └─────────────────────┘
```

### Monorepo 结构

使用 pnpm workspace 管理：

```
vidflow/
├── packages/
│   ├── core/           # @vidflow/core - 核心 SDK，纯 TS，可发布 npm
│   │   ├── src/
│   │   │   ├── platforms/   # 各平台适配器
│   │   │   │   ├── twitter/
│   │   │   │   ├── douyin/
│   │   │   │   ├── tiktok/
│   │   │   │   └── weibo/
│   │   │   ├── crawler/     # HTTP/WSS 爬虫客户端
│   │   │   ├── downloader/  # 文件下载器（含 m3u8）
│   │   │   ├── signature/   # X-Bogus / A-Bogus 签名
│   │   │   ├── proto/       # Protobuf 定义
│   │   │   ├── crypto/      # 加密工具（AES/RSA/SM4）
│   │   │   ├── config/      # 配置管理
│   │   │   ├── db/          # SQLite 缓存
│   │   │   ├── i18n/        # 国际化
│   │   │   └── utils/       # 通用工具
│   │   └── package.json
│   ├── cli/            # @vidflow/cli - 命令行工具
│   │   ├── src/
│   │   └── package.json
│   └── electron/       # @vidflow/electron - GUI 客户端
│       ├── src/
│       │   ├── main/        # Electron 主进程
│       │   └── renderer/    # React 渲染进程
│       └── package.json
├── docs/               # 文档（VitePress）
├── scripts/            # 构建脚本
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

---

## 开发阶段规划

> **策略：GUI 优先，Twitter 优先，monorepo 起步。** 核心目标是让用户尽早能用上带 Cookie 自动获取的桌面客户端下载推文。

### Phase 1: Monorepo 基础设施

**目标**：完成 monorepo 结构、core 骨架可运行、electron 空壳可启动
**成功标准**：`pnpm install` → `pnpm dev:electron` 能打开一个空白 Electron 窗口，core 能导出类型

| 任务 | 说明 | 依赖 |
|------|------|------|
| 初始化 monorepo | pnpm workspace + tsconfig.base + eslint + prettier | — |
| `@vidflow/core` 骨架 | package.json + tsconfig + 基础类型导出 | monorepo |
| `@vidflow/core` HTTP Crawler | 基于 fetch/undici 的异步 HTTP 客户端，支持代理/重试/超时 | core 骨架 |
| `@vidflow/core` 配置管理 | YAML 配置加载 + 默认配置 + 参数合并逻辑 | core 骨架 |
| `@vidflow/core` 通用工具 | URL 提取、随机字符串、Cookie 解析等 | core 骨架 |
| `@vidflow/electron` 骨架 | electron + react + vite，空白窗口可启动 | core 骨架 |
| IPC 通信通道 | main ↔ renderer 基本通信框架 | electron 骨架 |

### Phase 2: Electron GUI — Cookie 自动获取 + Twitter/X 下载

**目标**：用户能通过内嵌 WebView 登录 Twitter/X，自动提取 Cookie，粘贴推文链接即可下载媒体
**成功标准**：打开 GUI → 内嵌 WebView 登录 Twitter → 自动获取 Cookie → 粘贴推文链接 → 下载完成

| 任务 | 说明 | 依赖 |
|------|------|------|
| Twitter API 端点 | 将 Twitter API 端点移植为 TS 常量 | core HTTP Crawler |
| Twitter URL 解析 | unique_id / tweet_id 提取 | core |
| TwitterCrawler | 实现 `fetchTweetDetail` / `fetchUserTweets` 等核心方法 | API |
| WebView 登录页 | Electron 内嵌 WebView 让用户登录 Twitter | electron 骨架 |
| Cookie 自动提取 | `session.cookies.get()` 提取并注入 core | WebView 登录页 |
| Downloader | 单文件下载 + 断点续传 | core |
| m3u8 流下载 | 视频流下载（m3u8 解析 + TS 拼接） | Downloader |
| 下载管理 UI | 粘贴链接 → 解析 → 下载队列 → 进度显示 | 全部 |

### Phase 3: 抖音平台

**目标**：抖音平台完整适配 + GUI 支持

| 任务 | 说明 | 依赖 |
|------|------|------|
| 抖音 API 端点 | API 常量 + Zod 数据模型 | core |
| X-Bogus / A-Bogus 签名 | 从 f2 的 JS 文件移植为原生 TS | core |
| Token 管理 | msToken / ttwid / webid 生成 | core |
| 抖音 URL 解析 | sec_user_id / aweme_id / mix_id 提取 | core |
| DouyinCrawler | 实现全部 fetch 方法 | API + 签名 |
| Electron GUI 支持 | 抖音 WebView 登录 + GUI 适配 | DouyinCrawler |
| m3u8 / FLV 直播流下载 | 抖音直播录制 | Downloader |

### Phase 4: TikTok + Weibo + CLI

**目标**：补全剩余平台 + 命令行工具

| 任务 | 说明 |
|------|------|
| TikTok 全平台 | API + 模型 + 签名 + 下载 + Electron GUI 支持 |
| Weibo 全平台 | API + 模型 + 访客Cookie + 下载 + Electron GUI 支持 |
| `@vidflow/cli` | commander 框架 + Twitter + 抖音 + TikTok + Weibo |

### Phase 5: 完善与发布

| 任务 | 说明 |
|------|------|
| SQLite 缓存 | 下载记录去重 |
| 单元测试 | core 核心功能测试 |
| 文档 | VitePress 文档站 |
| Electron 打包 | electron-builder 打包 macOS/Windows/Linux |
| CI/CD | GitHub Actions 自动构建发布 |

### Phase 6: 直播弹幕（远期）

| 任务 | 说明 |
|------|------|
| Protobuf 编译 | 抖音/TikTok `.proto` → TS |
| WebSocket 弹幕 | WSS 连接 + protobuf 解析 |
| 本地 WS 转发 | 本地 WebSocket 服务器转发给前端 UI |

---

## 关键技术难点

### 1. Cookie 自动获取（Electron WebView 方案）

```typescript
// Electron main process
import { session } from 'electron'

// 用户在 WebView 中登录后，从 session 中提取 Cookie
async function getCookiesForDomain(domain: string): Promise<string> {
  const cookies = await session.defaultSession.cookies.get({ domain })
  return cookies.map(c => `${c.name}=${c.value}`).join('; ')
}
```

**优势**：
- 不依赖浏览器加密数据库，跨平台一致性好
- 用户无需手动复制 Cookie
- 应用关闭即销毁，安全性高
- 配合 Electron DevTools，可直接在 WebView 的 Network 面板观测平台 API 变化

### 2. X-Bogus / A-Bogus 签名

f2 中这些算法以 JS 文件存在，通过 `PyExecJS` 执行。移植到 TS 后可以直接原生调用，但需要：
- 理解算法逻辑，确保 TypeScript 实现与原 JS 输出一致
- A-Bogus 依赖浏览器指纹生成，需要在 Node.js 环境模拟

### 3. m3u8 流媒体下载

直播流下载需要：
- 解析 m3u8 播放列表
- 按序下载 TS 片段并拼接
- 处理片段过期、断流等异常情况

### 4. Protobuf 直播弹幕（远期）

抖音/TikTok 直播弹幕使用 protobuf 编码，需要：
- 将 `.proto` 文件编译为 TS 版本
- WebSocket 接收二进制数据后正确解析
- 本地 WebSocket 服务器转发给前端 UI

---

## 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 平台更新签名算法 | 功能失效 | 保持对 f2 上游的跟踪，及时同步 |
| Cookie 过期 | 需要重新登录 | GUI 中提供一键刷新 Cookie |
| 平台 API 变更 | 接口失效 | 利用 Electron DevTools 观测 + 完善的错误处理 |
| 法律合规 | 项目风险 | 仅用于学习研究，声明免责 |

---

## 开发进度

> 状态图例：🟢 已完成 🟡 进行中 🔴 未开始 ⚠️ 有阻塞

### Phase 1: Monorepo 基础设施 🟡 进行中（已完成开发，待提交）

| 任务 | 状态 | 说明 |
|------|------|------|
| 初始化 monorepo | 🟢 | pnpm workspace + tsconfig.base + eslint + prettier 已配置 |
| `@vidflow/core` 骨架 | 🟢 | package.json + tsconfig + 基础类型导出完成 |
| `@vidflow/core` HTTP Crawler | 🟢 | `HttpClient` 基于 fetch，支持重试/超时/代理/HEAD 方法 |
| `@vidflow/core` 配置管理 | 🟢 | `ConfigManager` YAML 加载/合并/保存，支持优先级 |
| `@vidflow/core` 通用工具 | 🟢 | URL 提取、随机字符串、Cookie 解析、文件名清洗等 |
| `@vidflow/electron` 骨架 | 🟢 | electron + react + vite + preload + contextBridge 完成 |
| IPC 通信通道 | 🟢 | main ↔ renderer `getCookies` / `download` 通道已建立 |

**当前阻塞**：
- ⚠️ Electron 二进制下载失败（国内连接 GitHub 问题），需配置 `ELECTRON_MIRROR` 环境变量或使用镜像源
- 代码尚未提交到 GitHub

**待完成**：
- 🔴 `pnpm install` 成功安装全部依赖（含 Electron 二进制）
- 🔴 `pnpm build:core` 验证 core 构建
- 🔴 `pnpm dev:electron` 验证 Electron 可启动

### Phase 2: Electron GUI — Cookie 自动获取 + Twitter/X 下载 🔴 未开始

### Phase 3: 抖音平台 🔴 未开始

### Phase 4: TikTok + Weibo + CLI 🔴 未开始

### Phase 5: 完善与发布 🔴 未开始

### Phase 6: 直播弹幕（远期） 🔴 未开始

---

## 下一步行动

1. **解决 Electron 依赖安装** — 配置镜像源，`pnpm install` 完成
2. **验证构建** — `pnpm build:core` + `pnpm dev:electron` 确保可运行
3. **提交 Phase 1 代码** — 提交并推送到 GitHub
4. **Phase 2 开始** — Twitter 平台适配 + Electron WebView 登录 + Cookie 自动提取 + 下载 UI

*最后更新: 2026-04-14*
