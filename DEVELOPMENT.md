# VidFlow 开发计划

## 项目背景

[f2](https://github.com/Johnserf-Seed/f2) 是一个基于 Python 的多平台视频下载工具，支持抖音、TikTok、Twitter/X、微博等平台。项目架构清晰但存在以下局限：

1. **跨平台分发困难** — Python 依赖需要用户安装运行时环境
2. **Cookie 获取不便** — 依赖 `browser_cookie3` 读取浏览器加密数据库，且 Chromium V20 加密后兼容性差
3. **签名算法隔阂** — X-Bogus / A-Bogus 本身是 JS 算法，通过 `PyExecJS` 在 Python 中调用，多了一层开销
4. **无 GUI** — 仅支持命令行，对普通用户不友好

**VidFlow** 选择 TypeScript + Electron 作为目标技术栈，从根本上解决这些问题。

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
              │  │  (DouYin,     │  │
              │  │   TikTok,     │  │
              │  │   Twitter,    │  │
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
│   │   │   │   ├── douyin/
│   │   │   │   ├── tiktok/
│   │   │   │   ├── twitter/
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

### Phase 1: 基础设施搭建

**目标**：完成 monorepo 结构、核心 SDK 骨架、CLI 基本可用

| 任务 | 说明 | 预计 |
|------|------|------|
| 初始化 monorepo | pnpm workspace + tsconfig + eslint + prettier | 0.5d |
| Core 项目骨架 | 导出结构、基础类型定义 | 0.5d |
| HTTP Crawler | 基于 Undici 的异步 HTTP 客户端，支持代理/重试/超时 | 1d |
| WebSocket Crawler | 基于 ws 的 WebSocket 客户端 | 1d |
| 配置管理 | YAML 配置加载、CLI 参数合并、默认配置生成 | 0.5d |
| CLI 入口 | commander 实现基础命令框架 | 0.5d |
| 日志系统 | winston/pino 日志 + CLI 彩色输出 | 0.5d |

### Phase 2: 抖音平台适配

**目标**：完成抖音平台全部已实现功能的移植

| 任务 | 说明 | 预计 |
|------|------|------|
| API 端点定义 | 将 `DouyinAPIEndpoints` 移植为 TS 常量 | 0.5d |
| 数据模型 | Zod schema 定义各接口的请求/响应类型 | 2d |
| X-Bogus 签名 | 从 f2 的 JS 文件移植为原生 TS | 1d |
| A-Bogus 签名 | 从 f2 的 JS 文件移植为原生 TS（含浏览器指纹生成） | 1.5d |
| Token 管理 | msToken / ttwid / webid 生成 | 1d |
| URL 解析器 | sec_user_id / aweme_id / mix_id / webcast_id 提取 | 1d |
| Crawler 适配 | DouyinCrawler 实现所有 fetch 方法 | 2d |
| 文件下载器 | 单文件下载 + 断点续传 + m3u8 流下载 | 2d |
| 直播弹幕 | WebSocket 连接 + Protobuf 解析 + 本地 WS 转发 | 2d |
| CLI 命令 | 抖音平台 CLI 命令完整实现 | 1d |

### Phase 3: TikTok / Twitter / Weibo 适配

**目标**：完成其余三个平台的移植

| 任务 | 说明 | 预计 |
|------|------|------|
| TikTok 全平台移植 | API + 模型 + 签名 + 下载 + CLI | 2d |
| Twitter 全平台移植 | API + 模型 + 下载 + CLI | 1.5d |
| Weibo 全平台移植 | API + 模型 + 访客Cookie + 下载 + CLI | 1.5d |

### Phase 4: Electron GUI 应用

**目标**：完成桌面客户端，实现 Cookie 自动获取

| 任务 | 说明 | 预计 |
|------|------|------|
| Electron 项目初始化 | main + renderer 基本结构 | 0.5d |
| WebView 登录页 | 嵌入 WebView 让用户登录各平台 | 1d |
| Cookie 自动提取 | Electron `session.cookies` API 提取 Cookie | 1d |
| 下载管理 UI | 粘贴链接 → 解析 → 下载队列 → 进度显示 | 2d |
| 设置页 | 代理、下载路径、文件名模板等配置 | 1d |
| 打包发布 | electron-builder 打包三平台 | 1d |

### Phase 5: 完善与优化

| 任务 | 说明 | 预计 |
|------|------|------|
| 国际化 | i18n 中英文支持 | 1d |
| SQLite 缓存 | 下载记录去重 | 0.5d |
| 单元测试 | core 模块核心功能测试 | 2d |
| 文档 | VitePress 文档站 | 2d |
| CI/CD | GitHub Actions 自动构建发布 | 1d |

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

### 2. X-Bogus / A-Bogus 签名

f2 中这些算法以 JS 文件存在，通过 `PyExecJS` 执行。移植到 TS 后可以直接原生调用，但需要：
- 理解算法逻辑，确保 TypeScript 实现与原 JS 输出一致
- A-Bogus 依赖浏览器指纹生成，需要在 Node.js 环境模拟

### 3. Protobuf 直播弹幕

抖音/TikTok 直播弹幕使用 protobuf 编码，需要：
- 将 `.proto` 文件编译为 TS 版本
- WebSocket 接收二进制数据后正确解析
- 本地 WebSocket 服务器转发给前端 UI

### 4. m3u8 流媒体下载

直播流下载需要：
- 解析 m3u8 播放列表
- 按序下载 TS 片段并拼接
- 处理片段过期、断流等异常情况

---

## 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 平台更新签名算法 | 功能失效 | 保持对 f2 上游的跟踪，及时同步 |
| Cookie 过期 | 需要重新登录 | GUI 中提供一键刷新 Cookie |
| 平台 API 变更 | 接口失效 | 完善的错误处理 + 单元测试覆盖 |
| 法律合规 | 项目风险 | 仅用于学习研究，声明免责 |

---

## 下一步行动

1. **确认开发计划** — 用户审阅本文档
2. **Phase 1 开始** — 初始化 monorepo，搭建基础设施
3. **逐步推进** — 每个 Phase 完成后进行功能验证

*最后更新: 2026-04-14*
