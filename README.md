# NPMate

[![CI](https://github.com/Garker/NPMate/actions/workflows/ci.yml/badge.svg)](https://github.com/Garker/NPMate/actions/workflows/ci.yml)
[![Release](https://github.com/Garker/NPMate/actions/workflows/release.yml/badge.svg)](https://github.com/Garker/NPMate/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

NPMate 是一个基于 Electron + React 的智能 JavaScript 项目依赖管理桌面应用。

当前完成：**Phase 7 — 桌面打包与发布准备**。

## 已完成

- Electron 主进程与窗口生命周期。
- `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。
- preload `contextBridge` 与最小化 IPC 连通性检查。
- React 19 + TypeScript + Vite renderer。
- Ant Design、Tailwind CSS、Zustand 基础接入。
- 开发者工具风格三栏应用壳与暗色模式。
- Dashboard、Packages、DependencyGraph、AISettings、Settings 页面入口。
- electron-builder 的 macOS、Windows、Linux 基础配置。
- 本地目录选择与 `package.json` 扫描。
- `pnpm-lock.yaml`、`bun.lock`、`bun.lockb`、`package-lock.json`、`yarn.lock` 包管理器识别。
- React、Vue、Next.js、Nuxt、Angular、Svelte、NestJS、Express、Vite 框架识别。
- Node 版本、依赖数量与 `node_modules` 大小统计。
- SQLite + Drizzle ORM 项目持久化。
- 项目刷新、打开目录、软删除与撤销。
- 读取并区分 `dependencies` 与 `devDependencies`。
- 使用项目锁文件对应的 npm、pnpm、yarn 或 Bun 执行命令。
- 安装包、指定版本安装、卸载包与单包升级。
- 命令执行前确认、执行状态及 stdout / stderr 结果反馈。
- npm Registry 关键词搜索与周下载量展示。
- 包详情、作者、许可证、GitHub 地址与 npm 页面入口。
- README 纯文本安全预览。
- 完整版本列表与弃用状态展示。
- 当前版本与 Registry 最新版本对比。
- major、minor、patch 升级类型识别。
- 单个升级与按顺序执行的批量升级。
- 基于 `npm ls --all --json` 的 React Flow 依赖关系图。
- `node_modules` 顶层包体积排行与重复版本检测。
- 根据包管理器生成 npm、pnpm、yarn、Bun 去重建议。
- OpenAI、DeepSeek、阿里百炼和自定义 OpenAI Compatible API。
- Claude、Gemini 与 Ollama 原生 LangChain.js 适配。
- AI 配置和连接测试。
- API Key 使用 Electron `safeStorage` 加密后存入 SQLite。
- Package Assistant 项目分析、npm 搜索、依赖分析与安装建议工具。
- Agent 只提供建议，未注册文件写入、shell 或安装工具。
- Node、npm、pnpm、yarn、Bun 版本与 nvm、fnm、Volta 检测。
- npm 官方源、npmmirror 和自定义 Registry 切换。
- 安装、卸载、升级命令与执行结果历史。
- macOS DMG/ZIP、Windows NSIS、Linux AppImage/DEB 打包配置。
- `better-sqlite3` Electron ABI 重建脚本。

## 环境要求

- Node.js 20 或更高版本
- npm 10、pnpm 9 或 Bun 1.1+

## 安装

前往 [GitHub Releases](https://github.com/Garker/NPMate/releases/latest) 下载对应系统的安装包：

- macOS：`.dmg`（或免安装的 `.zip`）
- Windows：NSIS `.exe`
- Linux：`.AppImage` 或 `.deb`

当前自动构建的安装包未进行商业代码签名。macOS 和 Windows 首次启动时可能显示系统安全提示，请只从本仓库的 Releases 下载，并可使用 Release 中的 `SHA256SUMS.txt` 校验文件完整性。

### macOS 提示“已损坏，无法打开”

确认安装包来自本仓库的 Releases，并将 NPMate 拖入“应用程序”文件夹后，在终端运行：

```bash
xattr -dr com.apple.quarantine /Applications/NPMate.app
```

然后重新打开 NPMate。命令应直接以 `xattr` 开头，不要在前面添加 `、` 等字符；如果应用安装在其他位置，请相应修改路径。

## 本地开发

```bash
git clone https://github.com/Garker/NPMate.git
cd NPMate
bun install --frozen-lockfile
bun run dev
```

类型检查与构建：

```bash
bun run typecheck
bun run build
```

重建原生 SQLite 模块并生成当前平台安装包：

```bash
bun run rebuild:native
bun run dist
```

仅生成未压缩应用目录，用于本地安装前检查：

```bash
bun run dist:dir
```

产物输出到 `release/`。正式发布前应配置对应平台的代码签名与公证凭据。

## 安全边界

- Renderer 不直接访问 Node.js。
- 文件系统、子进程、数据库和密钥操作必须放在 Electron 主进程。
- Renderer 只能通过 preload 暴露的白名单方法调用 IPC。
- AI 只能生成安装建议；执行安装前必须由用户确认。

## 阶段计划

1. Electron + React 基础框架（已完成）
2. 项目管理（已完成）
3. npm / pnpm / yarn 操作（已完成）
4. npm Registry 搜索（已完成）
5. 依赖升级、依赖图和 node_modules 分析（已完成）
6. AI 配置与 Package Assistant Agent（已完成）
7. 打包与发布（已完成）

## 参与贡献

欢迎提交 Issue 和 Pull Request。开始前请阅读 [贡献指南](CONTRIBUTING.md)；安全问题请按 [安全策略](SECURITY.md) 私下报告。本项目采用 [MIT License](LICENSE)。
